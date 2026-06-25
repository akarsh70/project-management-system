import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, CardActionArea, CardActions, Typography, Button,
  Chip, IconButton, TextField, InputAdornment, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, Skeleton, Menu, MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FolderIcon from '@mui/icons-material/Folder';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { useAppSelector } from '../../store';
import { projectsApi } from '../../api/projects.api';
import { usePermission } from '../../hooks/usePermission';
import { PageHeader } from '../../components/common/PageHeader';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useDebounce } from '../../hooks/useDebounce';
import { useIndexedDB } from '../../hooks/useIndexedDB';
import { formatRelativeTime } from '../../utils/helpers';
import { Project } from '../../types';
import { useEffect } from 'react';

const projectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional(),
});
type ProjectFormData = z.infer<typeof projectSchema>;

export default function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { currentOrg } = useAppSelector((s) => s.organization);
  const { canCreate, canDelete } = usePermission();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [menuProject, setMenuProject] = useState<{ project: Project; anchor: HTMLElement } | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const { save: saveDraft, load: loadDraft, remove: removeDraft } = useIndexedDB('project-drafts');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
  });

  const formValues = watch();
  useEffect(() => {
    if (createOpen && (formValues.name || formValues.description)) {
      saveDraft('new', formValues);
    }
  }, [formValues, createOpen]);

  const handleOpenCreate = async () => {
    const draft = await loadDraft('new');
    if (draft) { reset({ name: draft.name || '', description: draft.description || '' }); }
    setCreateOpen(true);
  };

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', currentOrg?.id],
    queryFn: () => projectsApi.getAll(currentOrg!.id),
    enabled: !!currentOrg,
  });

  const createMutation = useMutation({
    mutationFn: (data: ProjectFormData) => projectsApi.create(currentOrg!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      enqueueSnackbar('Project created!', { variant: 'success' });
      setCreateOpen(false);
      reset();
      removeDraft('new');
    },
    onError: () => enqueueSnackbar('Failed to create project', { variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(currentOrg!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      enqueueSnackbar('Project deleted', { variant: 'success' });
      setDeleteProject(null);
    },
  });

  const filtered = projects?.filter((p) =>
    p.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  ) || [];

  return (
    <Box>
      <PageHeader
        title="Projects"
        subtitle={`${projects?.length || 0} projects in ${currentOrg?.name || 'your organization'}`}
        actions={canCreate ? <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>New Project</Button> : undefined}
      />

      <TextField
        placeholder="Search projects..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
        sx={{ mb: 3, width: 320 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
      />

      {isLoading ? (
        <Grid container spacing={2}>{Array.from({ length: 6 }).map((_, i) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
            <Card><CardContent><Skeleton height={28} /><Skeleton /><Skeleton width="40%" /></CardContent></Card>
          </Grid>
        ))}</Grid>
      ) : (
        <Grid container spacing={2.5}>
          {filtered.map((project, index) => {
            const COLORS = ['#6366F1','#EC4899','#10B981','#F59E0B','#3B82F6','#8B5CF6'];
            const color = COLORS[index % COLORS.length];
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={project.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <Box sx={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
                  <CardActionArea sx={{ flexGrow: 1 }} onClick={() => navigate(`/projects/${project.id}`)}>
                    <CardContent sx={{ pt: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FolderIcon sx={{ color, fontSize: 20 }} />
                        </Box>
                        <Chip label={project.status} size="small" sx={{
                          bgcolor: project.status === 'ACTIVE' ? '#10B98115' : '#94A3B815',
                          color: project.status === 'ACTIVE' ? '#10B981' : '#94A3B8',
                          fontWeight: 700, fontSize: 11, height: 22,
                        }} />
                      </Box>
                      <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ mb: 0.5 }}>{project.name}</Typography>
                      {project.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>
                          {project.description}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 1 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color }} />
                        <Typography variant="caption" color="text.disabled">{formatRelativeTime(project.createdAt)}</Typography>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 1.5, pt: 0 }}>
                    <Button size="small" onClick={() => navigate(`/projects/${project.id}/tasks`)}
                      sx={{ color, fontWeight: 600, '&:hover': { bgcolor: color + '12' } }}>
                      View Tasks →
                    </Button>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setMenuProject({ project, anchor: e.currentTarget }); }}>
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
          {filtered.length === 0 && (
            <Grid size={{ xs: 12 }}>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <FolderIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" fontWeight={600}>No projects found</Typography>
                {canCreate && (
                  <Button sx={{ mt: 2 }} variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>Create Project</Button>
                )}
              </Box>
            </Grid>
          )}
        </Grid>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Project</DialogTitle>
        <Box component="form" onSubmit={handleSubmit((d) => createMutation.mutate(d))}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <TextField {...register('name')} label="Project name" fullWidth autoFocus error={!!errors.name} helperText={errors.name?.message} />
            <TextField {...register('description')} label="Description (optional)" fullWidth multiline rows={3} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Project menu */}
      <Menu anchorEl={menuProject?.anchor} open={!!menuProject} onClose={() => setMenuProject(null)}>
        <MenuItem onClick={() => { navigate(`/projects/${menuProject?.project.id}/tasks`); setMenuProject(null); }}>View Tasks</MenuItem>
        {canDelete && (
          <MenuItem onClick={() => { setDeleteProject(menuProject!.project); setMenuProject(null); }} sx={{ color: 'error.main' }}>Delete</MenuItem>
        )}
      </Menu>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteProject}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteProject?.name}"? This action cannot be undone.`}
        onConfirm={() => deleteProject && deleteMutation.mutate(deleteProject.id)}
        onCancel={() => setDeleteProject(null)}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}
