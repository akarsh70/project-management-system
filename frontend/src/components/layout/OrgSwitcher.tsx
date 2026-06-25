import React, { useState } from 'react';
import {
  Box, Button, Menu, MenuItem, Typography, Divider, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import BusinessIcon from '@mui/icons-material/Business';
import { useOrganization } from '../../hooks/useOrganization';
import { Organization } from '../../types';

export function OrgSwitcher() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [nameError, setNameError] = useState('');

  const { currentOrg, organizations, switchOrg, isLoading, createOrg, isCreating } = useOrganization();

  if (isLoading) return <Box sx={{ p: 2 }}><CircularProgress size={20} /></Box>;

  const handleOpenDialog = () => {
    setAnchorEl(null);
    setOrgName('');
    setNameError('');
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    const trimmed = orgName.trim();
    if (!trimmed) {
      setNameError('Organization name required hai');
      return;
    }
    const slug = trimmed.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    try {
      const newOrg = await createOrg({ name: trimmed, slug });
      switchOrg(newOrg);
      setDialogOpen(false);
    } catch (err: any) {
      setNameError(err?.response?.data?.message || 'Organization create nahi ho saki');
    }
  };

  return (
    <Box sx={{ px: 2, pb: 1 }}>
      <Button
        fullWidth
        variant="outlined"
        size="small"
        endIcon={<ExpandMoreIcon />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ justifyContent: 'space-between', textTransform: 'none', borderRadius: 2 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <BusinessIcon fontSize="small" color="primary" />
          <Typography variant="body2" fontWeight={600} noWrap>
            {currentOrg?.name || 'Select Organization'}
          </Typography>
        </Box>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { mt: 0.5, minWidth: 220, borderRadius: 2 } }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: 'block' }}>
          Your Organizations
        </Typography>
        {organizations.map((org: Organization) => (
          <MenuItem
            key={org.id}
            selected={org.id === currentOrg?.id}
            onClick={() => { switchOrg(org); setAnchorEl(null); }}
            sx={{ borderRadius: 1, mx: 0.5 }}
          >
            <Typography variant="body2" fontWeight={500}>{org.name}</Typography>
          </MenuItem>
        ))}
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={handleOpenDialog} sx={{ borderRadius: 1, mx: 0.5 }}>
          <AddIcon fontSize="small" sx={{ mr: 1 }} />
          <Typography variant="body2">Create Organization</Typography>
        </MenuItem>
      </Menu>

      <Dialog open={dialogOpen} onClose={() => !isCreating && setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>New Organization Banao</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Organization Name"
            value={orgName}
            onChange={(e) => { setOrgName(e.target.value); setNameError(''); }}
            error={!!nameError}
            helperText={nameError || 'e.g. "My Company", "Team Alpha"'}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={isCreating}>Cancel</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={isCreating || !orgName.trim()}
            startIcon={isCreating ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
