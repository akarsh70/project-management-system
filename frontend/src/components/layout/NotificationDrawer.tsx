import {
  Drawer, Box, Typography, IconButton, Button, Avatar, Chip,
  Divider, Stack, Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useAppDispatch, useAppSelector } from '../../store';
import { toggleNotificationDrawer } from '../../store/slices/uiSlice';
import { useNotifications } from '../../hooks/useNotifications';
import { formatRelativeTime } from '../../utils/helpers';
import { Notification } from '../../types';

function notifIcon(type: string) {
  if (type === 'TASK_ASSIGNED') return <TaskAltIcon sx={{ fontSize: 17 }} />;
  if (type === 'PROJECT_CREATED') return <FolderOpenIcon sx={{ fontSize: 17 }} />;
  return <InfoOutlinedIcon sx={{ fontSize: 17 }} />;
}

function notifColor(type: string) {
  if (type === 'TASK_ASSIGNED') return '#6366F1';
  if (type === 'PROJECT_CREATED') return '#10B981';
  return '#3B82F6';
}

function NotifItem({ n, onRead }: { n: Notification; onRead: (id: string) => void }) {
  const color = notifColor(n.type);
  return (
    <Box
      onClick={() => { if (!n.isRead) onRead(n.id); }}
      sx={{
        display: 'flex', gap: 1.5, px: 2, py: 1.8,
        cursor: n.isRead ? 'default' : 'pointer',
        bgcolor: n.isRead ? 'transparent' : (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.04)',
        borderLeft: n.isRead ? '3px solid transparent' : `3px solid ${color}`,
        transition: 'background 0.15s',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Avatar sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: color + '18', flexShrink: 0, mt: 0.2 }}>
        <Box sx={{ color }}>{notifIcon(n.type)}</Box>
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.3 }}>
          <Typography variant="body2" fontWeight={n.isRead ? 500 : 700} sx={{ lineHeight: 1.3 }}>
            {n.title}
          </Typography>
          {!n.isRead && (
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color, flexShrink: 0, mt: 0.5, ml: 1 }} />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5, display: 'block' }}>
          {n.message}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
          {formatRelativeTime(n.createdAt)}
        </Typography>
      </Box>
    </Box>
  );
}

export function NotificationDrawer() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.notificationDrawerOpen);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={() => dispatch(toggleNotificationDrawer())}
      PaperProps={{
        sx: {
          width: 380,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', borderRadius: 2 }}>
            <NotificationsOutlinedIcon sx={{ fontSize: 18 }} />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>Notifications</Typography>
            {unreadCount > 0 && (
              <Typography variant="caption" color="text.secondary">{unreadCount} unread</Typography>
            )}
          </Box>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          {unreadCount > 0 && (
            <Tooltip title="Mark all as read">
              <IconButton size="small" onClick={() => markAllAsRead()} sx={{ color: 'text.secondary' }}>
                <DoneAllIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <IconButton size="small" onClick={() => dispatch(toggleNotificationDrawer())} sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <Divider />

      {/* Notification list */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
            <NotificationsOutlinedIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 2 }} />
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              No notifications yet
            </Typography>
            <Typography variant="caption" color="text.disabled">
              You'll be notified when tasks are assigned to you
            </Typography>
          </Box>
        ) : (
          notifications.map((n, i) => (
            <Box key={n.id}>
              <NotifItem n={n} onRead={markAsRead} />
              {i < notifications.length - 1 && <Divider sx={{ opacity: 0.4 }} />}
            </Box>
          ))
        )}
      </Box>

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Divider />
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
            <Button
              size="small"
              variant="text"
              onClick={() => markAllAsRead()}
              disabled={unreadCount === 0}
              startIcon={<DoneAllIcon />}
              sx={{ color: 'text.secondary', fontSize: 12 }}
            >
              Mark all as read
            </Button>
          </Box>
        </>
      )}
    </Drawer>
  );
}
