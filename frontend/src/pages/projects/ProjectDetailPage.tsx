import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Chip, Typography, Paper, Skeleton, Stack, Avatar, Divider, Card, CardContent,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { useQuery } from '@tanstack/react-query';
import { useAppSelector } from '../../store';
import { projectsApi } from '../../api/projects.api';
import { formatDate } from '../../utils/helpers';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrg } = useAppSelector((s) => s.organization);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id, currentOrg?.id],
    queryFn: () => projectsApi.getById(currentOrg!.id, id!),
    enabled: !!currentOrg && !!id,
  });

  if (isLoading) return (
    <Box>
      <Skeleton variant="text" width={120} height={36} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3, mb: 3 }} />
      <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
    </Box>
  );

  const isActive = project?.status === 'ACTIVE';

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/projects')}
        sx={{ mb: 3, color: 'text.secondary', '&:hover': { bgcolor: 'action.hover' } }}
      >
        Back to Projects
      </Button>

      {/* Hero card */}
      <Card sx={{
        mb: 3, overflow: 'hidden',
        background: isActive
          ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'
          : 'linear-gradient(135deg, #475569 0%, #64748B 100%)',
        '&:hover': { transform: 'none', boxShadow: isActive ? '0 8px 32px rgba(99,102,241,0.4)' : '0 8px 32px rgba(0,0,0,0.2)' },
      }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 }, position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)' }} />
          <Box sx={{ position: 'absolute', bottom: -40, right: 60, width: 120, height: 120, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)' }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Avatar sx={{ width: 48, height: 48, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <FolderOpenIcon />
                </Avatar>
                <Chip
                  label={project?.status}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, border: '1px solid rgba(255,255,255,0.3)' }}
                />
              </Box>
              <Typography variant="h4" fontWeight={800} color="#fff" sx={{ mb: 0.5 }}>
                {project?.name}
              </Typography>
              {project?.description && (
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', maxWidth: 600 }}>
                  {project.description}
                </Typography>
              )}
            </Box>
            <Button
              variant="contained"
              startIcon={<TaskAltIcon />}
              onClick={() => navigate(`/projects/${id}/tasks`)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2) !important', color: '#fff',
                border: '1px solid rgba(255,255,255,0.35)', whiteSpace: 'nowrap',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3) !important', transform: 'translateY(-2px)' },
              }}
            >
              View Tasks
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Details */}
      <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Typography variant="subtitle2" color="text.secondary" fontWeight={700} sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 }}>
          Project Details
        </Typography>
        <Stack spacing={0} divider={<Divider />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
            <Avatar sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#6366F115' }}>
              <CalendarTodayOutlinedIcon sx={{ fontSize: 16, color: '#6366F1' }} />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.disabled" fontWeight={600}>Created On</Typography>
              <Typography variant="body2" fontWeight={600}>
                {project?.createdAt ? formatDate(project.createdAt) : '—'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
            <Avatar sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#10B98115' }}>
              <PersonOutlineIcon sx={{ fontSize: 16, color: '#10B981' }} />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.disabled" fontWeight={600}>Created By</Typography>
              <Typography variant="body2" fontWeight={600}>
                {project?.createdByUser
                  ? `${project.createdByUser.firstName} ${project.createdByUser.lastName}`
                  : '—'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
            <Avatar sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#F59E0B15' }}>
              <FolderOpenIcon sx={{ fontSize: 16, color: '#F59E0B' }} />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.disabled" fontWeight={600}>Status</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: isActive ? '#10B981' : '#94A3B8' }} />
                <Typography variant="body2" fontWeight={600}>{project?.status}</Typography>
              </Box>
            </Box>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
