import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Chip, Typography, Grid, Tabs, Tab,
  LinearProgress, Avatar, Tooltip, Stack,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FolderIcon from '@mui/icons-material/Folder';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useAppSelector } from '../../store';
import { projectsApi } from '../../api/projects.api';
import { tasksApi } from '../../api/tasks.api';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS } from '../../utils/constants';
import { Task, TaskStatus } from '../../types';

const STATUS_TABS: { label: string; value: TaskStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'To Do', value: 'TODO' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Review', value: 'REVIEW' },
  { label: 'Done', value: 'DONE' },
];

export default function MyTasksPage() {
  const navigate = useNavigate();
  const currentOrg = useAppSelector((s) => s.organization.currentOrg);
  const currentUser = useAppSelector((s) => s.auth.user);
  const [activeTab, setActiveTab] = useState<TaskStatus | 'ALL'>('ALL');

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', currentOrg?.id],
    queryFn: () => projectsApi.getAll(currentOrg!.id),
    enabled: !!currentOrg?.id,
  });

  const taskQueries = useQueries({
    queries: projects.map((p) => ({
      queryKey: ['tasks', currentOrg?.id, p.id],
      queryFn: () => tasksApi.getAll(currentOrg!.id, p.id),
      enabled: !!currentOrg?.id,
    })),
  });

  const allTasks: (Task & { projectName: string })[] = useMemo(() => {
    return taskQueries.flatMap((q, i) =>
      (q.data || [])
        .filter((t) => t.assignedTo === currentUser?.id || t.createdBy === currentUser?.id)
        .map((t) => ({ ...t, projectName: projects[i]?.name || 'Unknown' }))
    );
  }, [taskQueries, projects, currentUser?.id]);

  const isLoading = projectsLoading || taskQueries.some((q) => q.isLoading);

  const filtered = activeTab === 'ALL' ? allTasks : allTasks.filter((t) => t.status === activeTab);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: allTasks.length };
    STATUS_TABS.slice(1).forEach(({ value }) => {
      c[value] = allTasks.filter((t) => t.status === value).length;
    });
    return c;
  }, [allTasks]);

  if (!currentOrg) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <AssignmentIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Pehle ek Organization select karo
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="My Tasks"
        subtitle={`${allTasks.length} task${allTasks.length !== 1 ? 's' : ''} assigned to you`}
      />

      {isLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        {STATUS_TABS.map(({ label, value }) => (
          <Tab
            key={value}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                {label}
                <Chip
                  label={counts[value] ?? 0}
                  size="small"
                  sx={{
                    height: 18, fontSize: 11,
                    bgcolor: value === activeTab ? 'primary.main' : 'action.hover',
                    color: value === activeTab ? 'primary.contrastText' : 'text.secondary',
                  }}
                />
              </Box>
            }
            value={value}
          />
        ))}
      </Tabs>

      {!isLoading && filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <AssignmentIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {activeTab === 'ALL' ? 'Koi task assign nahi hai' : `Koi "${TASK_STATUS_LABELS[activeTab]}" task nahi`}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((task) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={task.id}>
              <Card
                variant="outlined"
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  '&:hover': { borderColor: 'primary.main', boxShadow: 2 },
                }}
                onClick={() => navigate(`/projects/${task.projectId}/tasks`)}
              >
                <CardContent sx={{ pb: '12px !important' }}>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={1}>
                    <Chip
                      label={TASK_STATUS_LABELS[task.status] || task.status}
                      size="small"
                      sx={{
                        bgcolor: TASK_STATUS_COLORS[task.status] + '22',
                        color: TASK_STATUS_COLORS[task.status],
                        fontWeight: 600, fontSize: 11,
                      }}
                    />
                    <Chip
                      label={TASK_PRIORITY_LABELS[task.priority] || task.priority}
                      size="small"
                      sx={{
                        bgcolor: TASK_PRIORITY_COLORS[task.priority] + '22',
                        color: TASK_PRIORITY_COLORS[task.priority],
                        fontWeight: 600, fontSize: 11,
                      }}
                    />
                  </Stack>

                  <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5, lineHeight: 1.3 }}>
                    {task.title}
                  </Typography>

                  {task.description && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {task.description}
                    </Typography>
                  )}

                  <Stack direction="row" alignItems="center" spacing={0.5} mt={1.5}>
                    <FolderIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {task.projectName}
                    </Typography>
                    {task.dueDate && (
                      <>
                        <Typography variant="caption" color="text.disabled">·</Typography>
                        <Typography
                          variant="caption"
                          color={new Date(task.dueDate) < new Date() ? 'error.main' : 'text.secondary'}
                        >
                          Due: {new Date(task.dueDate).toLocaleDateString('en-IN')}
                        </Typography>
                      </>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
