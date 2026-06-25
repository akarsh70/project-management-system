import {
  Box, Typography, Switch, Divider, Avatar, Chip, Stack, Card, CardContent,
} from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useAppDispatch, useAppSelector } from '../../store';
import { toggleTheme } from '../../store/slices/uiSlice';
import { PageHeader } from '../../components/common/PageHeader';
import { useOrganization } from '../../hooks/useOrganization';
import { ROLE_LABELS } from '../../utils/constants';

function SettingRow({ icon, color, title, description, action }: {
  icon: React.ReactNode; color: string; title: string; description: string; action?: React.ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
      <Avatar sx={{ width: 42, height: 42, borderRadius: 2.5, bgcolor: color + '15' }}>
        <Box sx={{ color, display: 'flex' }}>{icon}</Box>
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600}>{title}</Typography>
        <Typography variant="caption" color="text.secondary">{description}</Typography>
      </Box>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Box>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card sx={{ mb: 3, '&:hover': { transform: 'none' } }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary"
            sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 }}>
            {title}
          </Typography>
        </Box>
        <Divider />
        <Box sx={{ px: 3 }}>
          {children}
        </Box>
        <Box sx={{ pb: 1 }} />
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const { themeMode } = useAppSelector((s) => s.ui);
  const user = useAppSelector((s) => s.auth.user);
  const { currentOrg, currentRole } = useOrganization();

  const isDark = themeMode === 'dark';

  return (
    <Box sx={{ maxWidth: 680 }}>
      <PageHeader title="Settings" subtitle="Manage your preferences and workspace settings" />

      {/* Appearance */}
      <SectionCard title="Appearance">
        <SettingRow
          icon={isDark ? <DarkModeOutlinedIcon fontSize="small" /> : <LightModeOutlinedIcon fontSize="small" />}
          color={isDark ? '#8B5CF6' : '#F59E0B'}
          title={isDark ? 'Dark Mode' : 'Light Mode'}
          description="Switch between light and dark interface theme"
          action={
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="caption" color="text.disabled">{isDark ? 'Dark' : 'Light'}</Typography>
              <Switch
                checked={isDark}
                onChange={() => dispatch(toggleTheme())}
                color="primary"
                size="small"
              />
            </Stack>
          }
        />
      </SectionCard>

      {/* Account */}
      <SectionCard title="Account">
        <SettingRow
          icon={<PersonOutlineIcon fontSize="small" />}
          color="#6366F1"
          title={user ? `${user.firstName} ${user.lastName}` : 'Your Account'}
          description={user?.email || ''}
          action={
            <Chip label="Active" size="small"
              sx={{ bgcolor: '#10B98115', color: '#10B981', fontWeight: 700, height: 22, fontSize: 11 }} />
          }
        />
      </SectionCard>

      {/* Organization */}
      <SectionCard title="Organization">
        <SettingRow
          icon={<BusinessOutlinedIcon fontSize="small" />}
          color="#3B82F6"
          title={currentOrg?.name || 'No organization selected'}
          description={currentOrg ? `Slug: ${currentOrg.slug}` : 'Select an organization from the sidebar'}
          action={
            currentRole ? (
              <Chip
                label={ROLE_LABELS[currentRole] || currentRole}
                size="small"
                sx={{
                  fontWeight: 700, height: 24, fontSize: 11,
                  bgcolor: currentRole === 'ADMIN' ? '#6366F115' : currentRole === 'EDITOR' ? '#10B98115' : '#F59E0B15',
                  color: currentRole === 'ADMIN' ? '#6366F1' : currentRole === 'EDITOR' ? '#10B981' : '#F59E0B',
                }}
              />
            ) : null
          }
        />
      </SectionCard>

      {/* Security & Features */}
      <SectionCard title="Security & Features">
        <SettingRow
          icon={<ShieldOutlinedIcon fontSize="small" />}
          color="#10B981"
          title="JWT Authentication"
          description="Session secured with 15-min access token + 7-day refresh rotation"
          action={<CheckCircleOutlineIcon sx={{ color: '#10B981', fontSize: 20 }} />}
        />
        <Divider />
        <SettingRow
          icon={<NotificationsOutlinedIcon fontSize="small" />}
          color="#3B82F6"
          title="Real-time Notifications"
          description="Live updates via WebSocket — connected to your org room"
          action={<CheckCircleOutlineIcon sx={{ color: '#10B981', fontSize: 20 }} />}
        />
      </SectionCard>
    </Box>
  );
}
