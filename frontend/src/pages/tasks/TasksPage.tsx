import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip, Avatar, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, IconButton, Skeleton, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { useAppSelector } from '../../store';
import { tasksApi } from '../../api/tasks.api';
import { usePermission } from '../../hooks/usePermission';
import { PageHeader } from '../../components/common/PageHeader';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useIndexedDB } from '../../hooks/useIndexedDB';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS } from '../../utils/constants';
import { getInitials } from '../../utils/helpers';
import { Task, TaskStatus } from '../../types';

const createSchema = z.object({
  title: z.string().min(1, 'Title required').max(300),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const),
  dueDate: z.string().optional(),
});

const editSchema = z.object({
  title: z.string().min(1, 'Title required').max(300),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const),
  dueDate: z.string().optional(),
});

type CreateTaskFormData = z.infer<typeof createSchema>;
type EditTaskFormData = z.infer<typeof editSchema>;

const KANBAN_COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

export default function TasksPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { currentOrg } = useAppSelector((s) => s.organization);
  const { canCreate, canEdit, canDelete } = usePermission();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const { save: saveDraft, load: loadDraft, remove: removeDraft } = useIndexedDB('task-drafts');

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', currentOrg?.id, projectId],
    queryFn: () => tasksApi.getAll(currentOrg!.id, projectId!),
    enabled: !!currentOrg && !!projectId,
  });

  const createForm = useForm<CreateTaskFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { priority: 'MEDIUM' },
  });

  const editForm = useForm<EditTaskFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: { priority: 'MEDIUM', status: 'TODO' },
  });

  const createValues = createForm.watch();
  useEffect(() => {
    if (createOpen && createValues.title) saveDraft('new', createValues as any);
  }, [createValues, createOpen]);

  const createMutation = useMutation({
    mutationFn: (data: CreateTaskFormData) => {
      const payload: Record<string, any> = { title: data.title, priority: data.priority };
      if (data.description) payload.description = data.description;
      if (data.dueDate) payload.dueDate = data.dueDate;
      return tasksApi.create(currentOrg!.id, projectId!, payload as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      enqueueSnackbar('Task created successfully!', { variant: 'success' });
      setCreateOpen(false);
      createForm.reset();
      removeDraft('new');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      enqueueSnackbar(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to create task'), { variant: 'error' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EditTaskFormData> }) => {
      const payload: Record<string, any> = { ...data };
      if (payload.dueDate === '') delete payload.dueDate;
      if (payload.description === '') delete payload.description;
      return tasksApi.update(currentOrg!.id, projectId!, id, payload as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      enqueueSnackbar('Task updated!', { variant: 'success' });
      setEditTask(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      enqueueSnackbar(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to update task'), { variant: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.delete(currentOrg!.id, projectId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      enqueueSnackbar('Task deleted', { variant: 'success' });
      setDeleteTask(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      enqueueSnackbar(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to delete task'), { variant: 'error' });
    },
  });

  const tasksByStatus = KANBAN_COLUMNS.reduce((acc, status) => {
    acc[status] = tasks?.filter((t) => t.status === status) || [];
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  if (!currentOrg) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/projects')} sx={{ mb: 2 }}>
          Back to Projects
        </Button>
        <Alert severity="warning">Pehle ek Organization select karo sidebar se.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/projects/${projectId}`)} sx={{ mb: 2 }}>
        Back to Project
      </Button>
      <PageHeader
        title="Tasks"
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: 'Project', href: `/projects/${projectId}` },
          { label: 'Tasks' },
        ]}
        actions={
          canCreate ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={async () => {
                const d = await loadDraft('new');
                if (d) createForm.reset(d as any);
                setCreateOpen(true);
              }}
            >
              New Task
            </Button>
          ) : undefined
        }
      />

      {/* Kanban Board */}
      <Grid container spacing={2}>
        {KANBAN_COLUMNS.map((status) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={status}>
            <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 1.5, minHeight: 400 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: TASK_STATUS_COLORS[status] }} />
                <Typography variant="subtitle2" fontWeight={600}>{TASK_STATUS_LABELS[status]}</Typography>
                <Chip label={tasksByStatus[status]?.length || 0} size="small" sx={{ ml: 'auto', height: 20 }} />
              </Box>
              {isLoading
                ? Array.from({ length: 2 }).map((_, i) => (
                    <Card key={i} sx={{ mb: 1 }}>
                      <CardContent><Skeleton /><Skeleton width="60%" /></CardContent>
                    </Card>
                  ))
                : tasksByStatus[status].map((task) => (
                    <Card key={task.id} sx={{ mb: 1.5 }}>
                      <CardContent sx={{ pb: '12px !important' }}>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>{task.title}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Chip
                            label={TASK_PRIORITY_LABELS[task.priority]}
                            size="small"
                            sx={{
                              bgcolor: TASK_PRIORITY_COLORS[task.priority] + '20',
                              color: TASK_PRIORITY_COLORS[task.priority],
                              fontWeight: 600,
                              height: 20,
                            }}
                          />
                          {(canEdit || canDelete) && (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {canEdit && (
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setEditTask(task);
                                    editForm.reset({
                                      title: task.title,
                                      description: task.description || '',
                                      priority: task.priority,
                                      status: task.status,
                                      dueDate: task.dueDate || '',
                                    });
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              )}
                              {canDelete && (
                                <IconButton size="small" color="error" onClick={() => setDeleteTask(task)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                          )}
                        </Box>
                        {task.assignedToUser && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                            <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: 'primary.main' }}>
                              {getInitials(task.assignedToUser.firstName, task.assignedToUser.lastName)}
                            </Avatar>
                            <Typography variant="caption" color="text.secondary">
                              {task.assignedToUser.firstName}
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))}
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Create Task Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Task</DialogTitle>
        <Box component="form" onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              {...createForm.register('title')}
              label="Task title"
              fullWidth
              autoFocus
              error={!!createForm.formState.errors.title}
              helperText={createForm.formState.errors.title?.message}
            />
            <TextField {...createForm.register('description')} label="Description" fullWidth multiline rows={2} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Priority</InputLabel>
                  <Controller
                    name="priority"
                    control={createForm.control}
                    render={({ field }) => (
                      <Select {...field} label="Priority">
                        {Object.keys(TASK_PRIORITY_LABELS).map((p) => (
                          <MenuItem key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  {...createForm.register('dueDate')}
                  label="Due date"
                  type="date"
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editTask} onClose={() => setEditTask(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Task</DialogTitle>
        <Box
          component="form"
          onSubmit={editForm.handleSubmit((d) => editTask && updateMutation.mutate({ id: editTask.id, data: d }))}
        >
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              {...editForm.register('title')}
              label="Task title"
              fullWidth
              error={!!editForm.formState.errors.title}
              helperText={editForm.formState.errors.title?.message}
            />
            <TextField {...editForm.register('description')} label="Description" fullWidth multiline rows={2} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Controller
                    name="status"
                    control={editForm.control}
                    render={({ field }) => (
                      <Select {...field} label="Status">
                        {Object.keys(TASK_STATUS_LABELS).map((s) => (
                          <MenuItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Priority</InputLabel>
                  <Controller
                    name="priority"
                    control={editForm.control}
                    render={({ field }) => (
                      <Select {...field} label="Priority">
                        {Object.keys(TASK_PRIORITY_LABELS).map((p) => (
                          <MenuItem key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditTask(null)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTask}
        title="Delete Task"
        message={`Delete "${deleteTask?.title}"?`}
        onConfirm={() => deleteTask && deleteMutation.mutate(deleteTask.id)}
        onCancel={() => setDeleteTask(null)}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}
