import { useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Avatar, Divider, Grid, Card, CardContent, Chip, Stack,
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useAppDispatch, useAppSelector } from '../../store';
import { updateUser } from '../../store/slices/authSlice';
import { usersApi } from '../../api/users.api';
import { PageHeader } from '../../components/common/PageHeader';
import { getInitials, formatDate } from '../../utils/helpers';

const schema = z.object({
  firstName: z.string().min(1, 'Required').max(100),
  lastName: z.string().min(1, 'Required').max(100),
  avatarUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const user = useAppSelector((s) => s.auth.user);

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: user?.firstName || '', lastName: user?.lastName || '', avatarUrl: user?.avatarUrl || '' },
  });

  useEffect(() => {
    if (user) reset({ firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl || '' });
  }, [user, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => usersApi.updateMe(data),
    onSuccess: (updated) => {
      dispatch(updateUser(updated));
      enqueueSnackbar('Profile updated successfully!', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to update profile', { variant: 'error' }),
  });

  return (
    <Box sx={{ maxWidth: 760 }}>
      <PageHeader title="My Profile" subtitle="Manage your personal information" />

      <Grid container spacing={3}>
        {/* Left — Avatar card */}
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ '&:hover': { transform: 'none' }, textAlign: 'center' }}>
            <CardContent sx={{ p: 3.5 }}>
              <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                <Avatar sx={{
                  width: 96, height: 96, fontSize: 32, fontWeight: 800,
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
                }}>
                  {user?.avatarUrl
                    ? <img src={user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (user ? getInitials(user.firstName, user.lastName) : 'U')}
                </Avatar>
                <Box sx={{
                  position: 'absolute', bottom: 4, right: 4,
                  width: 14, height: 14, borderRadius: '50%',
                  bgcolor: '#10B981', border: '2px solid white',
                }} />
              </Box>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                {user?.firstName} {user?.lastName}
              </Typography>
              <Chip label="Active" size="small"
                sx={{ bgcolor: '#10B98115', color: '#10B981', fontWeight: 700, mb: 2.5, height: 22, fontSize: 11 }} />
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <EmailOutlinedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ fontWeight: 500 }}>
                    {user?.email}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <CalendarTodayOutlinedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Joined {user?.createdAt ? formatDate(user.createdAt) : '—'}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Right — Edit form */}
        <Grid size={{ xs: 12, sm: 8 }}>
          <Card sx={{ '&:hover': { transform: 'none' } }}>
            <CardContent sx={{ p: 3.5 }}>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary"
                sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 11, mb: 2.5 }}>
                Edit Profile
              </Typography>
              <Box component="form" onSubmit={handleSubmit((d) => mutation.mutate(d))} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      {...register('firstName')} label="First name" fullWidth size="small"
                      error={!!errors.firstName} helperText={errors.firstName?.message}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      {...register('lastName')} label="Last name" fullWidth size="small"
                      error={!!errors.lastName} helperText={errors.lastName?.message}
                    />
                  </Grid>
                </Grid>
                <TextField
                  label="Email address" value={user?.email || ''} fullWidth size="small"
                  disabled
                  helperText="Email address cannot be changed"
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'action.hover' } }}
                />
                <TextField
                  {...register('avatarUrl')} label="Avatar URL (optional)" fullWidth size="small"
                  placeholder="https://example.com/avatar.jpg"
                  error={!!errors.avatarUrl} helperText={errors.avatarUrl?.message}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SaveOutlinedIcon />}
                    disabled={!isDirty || mutation.isPending}
                    sx={{ minWidth: 140 }}
                  >
                    {mutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
