import { useState } from 'react';
import {
  Box, Card, Typography, Avatar, Chip, Button, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, MenuItem, FormControl,
  InputLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Stack, Tooltip, Skeleton, Alert,
} from '@mui/material';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { useAppSelector } from '../../store';
import { organizationsApi } from '../../api/organizations.api';
import { PageHeader } from '../../components/common/PageHeader';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { usePermission } from '../../hooks/usePermission';
import { getInitials, formatDate } from '../../utils/helpers';
import { Membership, MemberRole } from '../../types';
import { ROLE_LABELS } from '../../utils/constants';

const ROLE_CONFIG: Record<MemberRole, { color: string; bg: string; desc: string }> = {
  ADMIN:  { color: '#6366F1', bg: '#6366F115', desc: 'Full access + member management' },
  EDITOR: { color: '#10B981', bg: '#10B98115', desc: 'Can create and edit tasks/projects' },
  VIEWER: { color: '#F59E0B', bg: '#F59E0B15', desc: 'Read-only access' },
};

const addMemberSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER'] as const),
});
type AddMemberForm = z.infer<typeof addMemberSchema>;

export default function MembersPage() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { currentOrg } = useAppSelector((s) => s.organization);
  const currentUser = useAppSelector((s) => s.auth.user);
  const { canManageMembers } = usePermission();

  const [addOpen, setAddOpen] = useState(false);
  const [editMember, setEditMember] = useState<Membership | null>(null);
  const [editRole, setEditRole] = useState<MemberRole>('VIEWER');
  const [removeMember, setRemoveMember] = useState<Membership | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ['members', currentOrg?.id],
    queryFn: () => organizationsApi.getMembers(currentOrg!.id),
    enabled: !!currentOrg,
  });

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<AddMemberForm>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { role: 'VIEWER' },
  });

  const addMutation = useMutation({
    mutationFn: (data: AddMemberForm) =>
      organizationsApi.addMember(currentOrg!.id, data.email, data.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      enqueueSnackbar('Member added successfully!', { variant: 'success' });
      setAddOpen(false);
      reset();
    },
    onError: (err: any) =>
      enqueueSnackbar(err?.response?.data?.error?.message || 'Failed to add member. Check if user is registered.', { variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: MemberRole }) =>
      organizationsApi.updateMember(currentOrg!.id, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      enqueueSnackbar('Role updated successfully!', { variant: 'success' });
      setEditMember(null);
    },
    onError: () => enqueueSnackbar('Failed to update role', { variant: 'error' }),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) =>
      organizationsApi.removeMember(currentOrg!.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      enqueueSnackbar('Member removed', { variant: 'success' });
      setRemoveMember(null);
    },
    onError: () => enqueueSnackbar('Failed to remove member', { variant: 'error' }),
  });

  if (!currentOrg) {
    return (
      <Box>
        <PageHeader title="Members" subtitle="Manage organization members" />
        <Alert severity="info" sx={{ borderRadius: 2 }}>Select an organization from the sidebar first.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Members"
        subtitle={`${members?.length || 0} members in ${currentOrg.name}`}
        actions={
          canManageMembers ? (
            <Button variant="contained" startIcon={<PersonAddOutlinedIcon />} onClick={() => setAddOpen(true)}>
              Add Member
            </Button>
          ) : undefined
        }
      />

      {/* Role legend (non-admin) */}
      {!canManageMembers && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {(Object.keys(ROLE_CONFIG) as MemberRole[]).map((role) => {
            const rc = ROLE_CONFIG[role];
            return (
              <Box key={role} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, bgcolor: rc.bg, borderRadius: 2 }}>
                <Chip label={ROLE_LABELS[role]} size="small" sx={{ bgcolor: 'transparent', color: rc.color, fontWeight: 700, fontSize: 12 }} />
                <Typography variant="caption" sx={{ color: rc.color }}>{rc.desc}</Typography>
              </Box>
            );
          })}
        </Box>
      )}

      <Card sx={{ '&:hover': { transform: 'none' } }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Member
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Email
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Role
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Joined
                </TableCell>
                {canManageMembers && (
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Actions
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Stack direction="row" spacing={1.5} alignItems="center"><Skeleton variant="circular" width={38} height={38} /><Skeleton width={120} /></Stack></TableCell>
                      <TableCell><Skeleton width={180} /></TableCell>
                      <TableCell><Skeleton width={70} height={28} /></TableCell>
                      <TableCell><Skeleton width={100} /></TableCell>
                      {canManageMembers && <TableCell />}
                    </TableRow>
                  ))
                : members?.map((m) => {
                    const isMe = m.userId === currentUser?.id;
                    const rc = ROLE_CONFIG[m.role];
                    const name = m.user ? `${m.user.firstName} ${m.user.lastName}` : 'Unknown User';
                    return (
                      <TableRow
                        key={m.id}
                        sx={{ '&:last-child td': { border: 0 }, '&:hover': { bgcolor: 'action.hover' }, transition: 'background 0.15s' }}
                      >
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Avatar sx={{
                              width: 38, height: 38, fontSize: 13, fontWeight: 700,
                              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                            }}>
                              {m.user ? getInitials(m.user.firstName, m.user.lastName) : '?'}
                            </Avatar>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                <Typography variant="body2" fontWeight={600}>{name}</Typography>
                                {isMe && (
                                  <Chip
                                    label="You"
                                    size="small"
                                    sx={{ height: 18, fontSize: 10, bgcolor: '#6366F115', color: '#6366F1', fontWeight: 700 }}
                                  />
                                )}
                              </Box>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{m.user?.email || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={ROLE_LABELS[m.role]}
                            size="small"
                            icon={m.role === 'ADMIN' ? <ShieldOutlinedIcon style={{ fontSize: 13 }} /> : undefined}
                            sx={{ bgcolor: rc.bg, color: rc.color, fontWeight: 700, fontSize: 12, height: 26,
                              '& .MuiChip-icon': { color: rc.color } }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{formatDate(m.createdAt)}</Typography>
                        </TableCell>
                        {canManageMembers && (
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title={isMe ? "Can't edit your own role" : 'Change role'}>
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled={isMe}
                                    onClick={() => { setEditMember(m); setEditRole(m.role); }}
                                    sx={{ color: 'text.secondary', '&:hover': { color: '#6366F1', bgcolor: '#6366F115' } }}
                                  >
                                    <EditOutlinedIcon sx={{ fontSize: 17 }} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title={isMe ? "Can't remove yourself" : 'Remove from org'}>
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled={isMe}
                                    onClick={() => setRemoveMember(m)}
                                    sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: '#EF444415' } }}
                                  >
                                    <DeleteOutlinedIcon sx={{ fontSize: 17 }} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </TableContainer>
        {!isLoading && (!members || members.length === 0) && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <GroupsOutlinedIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={600}>No members yet</Typography>
          </Box>
        )}
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={addOpen} onClose={() => { setAddOpen(false); reset(); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar sx={{ width: 42, height: 42, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', borderRadius: 2.5 }}>
              <PersonAddOutlinedIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>Add Member</Typography>
              <Typography variant="caption" color="text.secondary">Invite someone to {currentOrg.name}</Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <Box component="form" onSubmit={handleSubmit((d) => addMutation.mutate(d))}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
            <TextField
              {...register('email')}
              label="Email address"
              type="email"
              fullWidth
              autoFocus
              error={!!errors.email}
              helperText={errors.email?.message || 'User must already have a registered account'}
            />
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select {...field} label="Role">
                    {(Object.keys(ROLE_CONFIG) as MemberRole[]).map((role) => {
                      const rc = ROLE_CONFIG[role];
                      return (
                        <MenuItem key={role} value={role}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Chip label={ROLE_LABELS[role]} size="small" sx={{ bgcolor: rc.bg, color: rc.color, fontWeight: 700, minWidth: 60 }} />
                            <Typography variant="body2" color="text.secondary">{rc.desc}</Typography>
                          </Stack>
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              )}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button onClick={() => { setAddOpen(false); reset(); }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editMember} onClose={() => setEditMember(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Change Role</DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Update role for <strong>{editMember?.user?.firstName} {editMember?.user?.lastName}</strong>
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select value={editRole} label="Role" onChange={(e) => setEditRole(e.target.value as MemberRole)}>
              <MenuItem value="VIEWER">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label="Viewer" size="small" sx={{ bgcolor: '#F59E0B15', color: '#F59E0B', fontWeight: 700 }} />
                  <Typography variant="caption" color="text.secondary">Read-only</Typography>
                </Stack>
              </MenuItem>
              <MenuItem value="EDITOR">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label="Editor" size="small" sx={{ bgcolor: '#10B98115', color: '#10B981', fontWeight: 700 }} />
                  <Typography variant="caption" color="text.secondary">Create & edit</Typography>
                </Stack>
              </MenuItem>
              <MenuItem value="ADMIN">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label="Admin" size="small" sx={{ bgcolor: '#6366F115', color: '#6366F1', fontWeight: 700 }} />
                  <Typography variant="caption" color="text.secondary">Full access</Typography>
                </Stack>
              </MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setEditMember(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={updateMutation.isPending || editRole === editMember?.role}
            onClick={() => editMember && updateMutation.mutate({ userId: editMember.userId, role: editRole })}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Role'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Confirm */}
      <ConfirmDialog
        open={!!removeMember}
        title="Remove Member"
        message={`Remove ${removeMember?.user?.firstName} ${removeMember?.user?.lastName} from ${currentOrg.name}? They will lose access to all projects immediately.`}
        confirmLabel="Remove"
        onConfirm={() => removeMember && removeMutation.mutate(removeMember.userId)}
        onCancel={() => setRemoveMember(null)}
        loading={removeMutation.isPending}
      />
    </Box>
  );
}
