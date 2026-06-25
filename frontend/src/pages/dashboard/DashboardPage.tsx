import { useNavigate } from 'react-router-dom';
import {
  Grid, Card, CardContent, CardActionArea, Typography, Box, Chip,
  Button, Skeleton, Avatar, Stack,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import GroupsIcon from '@mui/icons-material/Groups';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { useQuery } from '@tanstack/react-query';
import { useAppSelector } from '../../store';
import { projectsApi } from '../../api/projects.api';
import { formatRelativeTime } from '../../utils/helpers';

const PROJECT_COLORS = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'];

function StatCard({ title, value, icon, gradient, subtitle }: {
  title: string; value: number | string; icon: React.ReactNode; gradient: string; subtitle?: string;
}) {
  return (
    <Card sx={{ height: '100%', '&:hover': { transform: 'translateY(-4px)' } }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2.5 }}>
          <Avatar sx={{ width: 52, height: 52, borderRadius: 3, background: gradient,
            boxShadow: `0 8px 20px ${gradient.match(/#\w+/)?.[0] ?? '#000'}30` }}>
            {icon}
          </Avatar>
          <Chip label="Live" size="small"
            sx={{ bgcolor: '#10B98115', color: '#10B981', fontWeight: 700, fontSize: 11, height: 22 }} />
        </Box>
        <Typography variant="h3" fontWeight={800} sx={{ lineHeight: 1, mb: 0.5 }}>{value}</Typography>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>{title}</Typography>
        {subtitle && <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>{subtitle}</Typography>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { currentOrg } = useAppSelector((s) => s.organization);
  const user = useAppSelector((s) => s.auth.user);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', currentOrg?.id],
    queryFn: () => projectsApi.getAll(currentOrg!.id),
    enabled: !!currentOrg,
  });

  const recentProjects = projects?.slice(0, 6) || [];
  const activeCount = projects?.filter((p) => p.status === 'ACTIVE').length || 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <Box>
      {/* Hero Banner */}
      <Card sx={{ mb: 4, overflow: 'hidden',
        background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 55%, #EC4899 100%)',
        '&:hover': { transform: 'none', boxShadow: '0 8px 32px rgba(99,102,241,0.4)' },
      }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 }, position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)' }} />
          <Box sx={{ position: 'absolute', bottom: -60, right: 80, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)' }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
            <Box>
              <Typography variant="h4" fontWeight={800} color="#fff" sx={{ mb: 0.5 }}>
                {greeting}, {user?.firstName}! 👋
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2 }}>
                {currentOrg ? `Welcome to ${currentOrg.name} workspace` : 'Select an organization to get started'}
              </Typography>
              {currentOrg && (
                <Stack direction="row" spacing={3} divider={<Box sx={{ width: '1px', minWidth: '1px', bgcolor: 'rgba(255,255,255,0.3)', alignSelf: 'stretch' }} />}>
                  <Box>
                    <Typography variant="h5" fontWeight={800} color="#fff">{projects?.length || 0}</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Projects</Typography>
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight={800} color="#fff">{activeCount}</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Active</Typography>
                  </Box>
                </Stack>
              )}
            </Box>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/projects')}
              sx={{ bgcolor: 'rgba(255,255,255,0.2) !important', color: '#fff', border: '1px solid rgba(255,255,255,0.35)',
                backdropFilter: 'blur(10px)', whiteSpace: 'nowrap',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3) !important', transform: 'translateY(-2px)' },
              }}>
              New Project
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard title="Total Projects" value={isLoading ? '—' : (projects?.length || 0)}
            icon={<FolderOpenIcon />} gradient="linear-gradient(135deg, #6366F1, #8B5CF6)" subtitle="All time" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard title="Active Projects" value={isLoading ? '—' : activeCount}
            icon={<TaskAltIcon />} gradient="linear-gradient(135deg, #10B981, #34D399)" subtitle="Currently running" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard title="Organization" value={currentOrg?.name || '—'}
            icon={<GroupsIcon />} gradient="linear-gradient(135deg, #F59E0B, #FBBF24)" subtitle="Current workspace" />
        </Grid>
      </Grid>

      {/* Recent Projects Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Recent Projects</Typography>
          <Typography variant="caption" color="text.secondary">Your latest work</Typography>
        </Box>
        {(projects?.length ?? 0) > 0 && (
          <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/projects')}>View all</Button>
        )}
      </Box>

      <Grid container spacing={2.5}>
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                <Card><CardContent>
                  <Skeleton variant="rectangular" height={4} sx={{ borderRadius: 2, mb: 2 }} />
                  <Skeleton height={28} width="60%" /><Skeleton /><Skeleton width="40%" />
                </CardContent></Card>
              </Grid>
            ))
          : recentProjects.map((project, index) => {
              const color = PROJECT_COLORS[index % PROJECT_COLORS.length];
              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={project.id}>
                  <Card sx={{ height: '100%', overflow: 'hidden' }}>
                    <CardActionArea sx={{ height: '100%' }} onClick={() => navigate(`/projects/${project.id}`)}>
                      <Box sx={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}aa)` }} />
                      <CardContent sx={{ pt: 2.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Avatar sx={{ width: 42, height: 42, borderRadius: 2.5, bgcolor: color + '18', color }}>
                            <FolderOpenIcon fontSize="small" />
                          </Avatar>
                          <Chip label={project.status} size="small" sx={{
                            bgcolor: project.status === 'ACTIVE' ? '#10B98115' : '#94A3B815',
                            color: project.status === 'ACTIVE' ? '#10B981' : '#94A3B8',
                            fontWeight: 700, fontSize: 11, height: 22,
                          }} />
                        </Box>
                        <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ mb: 0.5 }}>{project.name}</Typography>
                        {project.description && (
                          <Typography variant="body2" color="text.secondary" sx={{
                            mb: 1.5, display: '-webkit-box', WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}>
                            {project.description}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 1.5 }}>
                          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color }} />
                          <Typography variant="caption" color="text.disabled">{formatRelativeTime(project.createdAt)}</Typography>
                        </Box>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}

        {!isLoading && recentProjects.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Card sx={{ textAlign: 'center', py: 8, '&:hover': { transform: 'none' } }}>
              <RocketLaunchIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" fontWeight={600} gutterBottom>No projects yet</Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>Create your first project to get started</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/projects')}>Create First Project</Button>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
