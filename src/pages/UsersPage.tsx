import React, { useState, useEffect } from 'react';
import {
  Box, Button, Paper, Stack, Typography, Chip, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, CircularProgress, Switch, FormControlLabel, InputAdornment,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  LockReset as LockResetIcon, AdminPanelSettings as AdminIcon,
  PointOfSale as SalesIcon, Visibility, VisibilityOff,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PageHeader from '../components/common/PageHeader';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { usersApi, AppUser } from '../api/users';
import { useAuthStore } from '../store/authStore';

// ── Schemas ────────────────────────────────────────────────────────────────
const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
  role: z.enum(['admin', 'sales']),
});

const editSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['admin', 'sales']),
  isActive: z.boolean(),
});

const passwordSchema = z.object({
  newPassword: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

// ── Helpers ────────────────────────────────────────────────────────────────
function roleChip(role: string) {
  return role === 'admin'
    ? <Chip icon={<AdminIcon sx={{ fontSize: '14px !important' }} />} label="Admin" color="primary" size="small" />
    : <Chip icon={<SalesIcon sx={{ fontSize: '14px !important' }} />} label="Sales Staff" color="default" size="small" />;
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function UsersPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { user: me } = useAuthStore();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AppUser | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<AppUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);

  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Forms
  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema), defaultValues: { role: 'sales' } });
  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) });
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  async function fetchUsers() {
    try {
      setUsers(await usersApi.getAll());
    } catch {
      enqueueSnackbar('Failed to load users', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []); // eslint-disable-line

  // ── Create ────────────────────────────────────────────────────────────────
  async function handleCreate(data: CreateForm) {
    setSaving(true);
    try {
      await usersApi.create(data);
      enqueueSnackbar('User created successfully', { variant: 'success' });
      setCreateOpen(false);
      createForm.reset({ role: 'sales' });
      fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create user';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  function openEdit(u: AppUser) {
    setEditTarget(u);
    editForm.reset({ name: u.name, role: u.role, isActive: u.isActive });
  }

  async function handleEdit(data: EditForm) {
    if (!editTarget) return;
    setSaving(true);
    try {
      await usersApi.update(editTarget._id, data);
      enqueueSnackbar('User updated', { variant: 'success' });
      setEditTarget(null);
      fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  // ── Reset password ────────────────────────────────────────────────────────
  async function handleResetPassword(data: PasswordForm) {
    if (!passwordTarget) return;
    setSaving(true);
    try {
      await usersApi.resetPassword(passwordTarget._id, data.newPassword);
      enqueueSnackbar('Password reset successfully', { variant: 'success' });
      setPasswordTarget(null);
      passwordForm.reset();
    } catch {
      enqueueSnackbar('Failed to reset password', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await usersApi.delete(deleteTarget._id);
      enqueueSnackbar('User deleted', { variant: 'success' });
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to delete';
      enqueueSnackbar(msg, { variant: 'error' });
    }
  }

  return (
    <Box>
      <PageHeader
        title="Users & Roles"
        subtitle="Manage admin and billing staff accounts"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { createForm.reset({ role: 'sales' }); setCreateOpen(true); }}>
            Add User
          </Button>
        }
      />

      {loading ? (
        <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>
      ) : (
        <Stack spacing={1.5}>
          {users.map((u) => (
            <Paper key={u._id} sx={{ px: 2.5, py: 1.5 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                {/* Avatar */}
                <Avatar sx={{ bgcolor: u.role === 'admin' ? 'primary.main' : 'grey.400', width: 40, height: 40, fontWeight: 700 }}>
                  {initials(u.name)}
                </Avatar>

                {/* Info */}
                <Box flex={1} minWidth={0}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body1" fontWeight={600} noWrap>{u.name}</Typography>
                    {u._id === me?.id && (
                      <Chip label="You" size="small" color="success" sx={{ height: 18, fontSize: 10 }} />
                    )}
                    {!u.isActive && (
                      <Chip label="Inactive" size="small" color="error" sx={{ height: 18, fontSize: 10 }} />
                    )}
                  </Stack>
                  <Typography variant="body2" color="text.secondary" noWrap>{u.email}</Typography>
                </Box>

                {/* Role */}
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                  {roleChip(u.role)}
                </Box>

                {/* Last login */}
                <Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 140 }}>
                  <Typography variant="caption" color="text.secondary">
                    {u.lastLogin
                      ? `Last login: ${new Date(u.lastLogin).toLocaleDateString('en-IN')}`
                      : 'Never logged in'}
                  </Typography>
                </Box>

                {/* Actions — hidden entirely for own account */}
                <Stack direction="row" spacing={0.5} minWidth={96}>
                  {u._id !== me?.id && (
                    <>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(u)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Reset Password">
                        <IconButton size="small" color="warning" onClick={() => { setPasswordTarget(u); passwordForm.reset(); }}>
                          <LockResetIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(u)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </Stack>
              </Stack>
            </Paper>
          ))}

          {users.length === 0 && (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <Typography color="text.secondary">No users found.</Typography>
            </Paper>
          )}
        </Stack>
      )}

      {/* ── Create Dialog ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={0.5}>
            <Controller name="name" control={createForm.control} render={({ field }) => (
              <TextField {...field} label="Full Name *" size="small" fullWidth
                error={!!createForm.formState.errors.name}
                helperText={createForm.formState.errors.name?.message} />
            )} />
            <Controller name="email" control={createForm.control} render={({ field }) => (
              <TextField {...field} label="Email *" size="small" fullWidth type="email"
                error={!!createForm.formState.errors.email}
                helperText={createForm.formState.errors.email?.message} />
            )} />
            <Controller name="password" control={createForm.control} render={({ field }) => (
              <TextField {...field} label="Password *" size="small" fullWidth
                type={showPassword ? 'text' : 'password'}
                error={!!createForm.formState.errors.password}
                helperText={createForm.formState.errors.password?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }} />
            )} />
            <Controller name="role" control={createForm.control} render={({ field }) => (
              <TextField {...field} select label="Role *" size="small" fullWidth>
                <MenuItem value="admin">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <AdminIcon fontSize="small" color="primary" />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>Admin</Typography>
                      <Typography variant="caption" color="text.secondary">Full access to all modules</Typography>
                    </Box>
                  </Stack>
                </MenuItem>
                <MenuItem value="sales">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <SalesIcon fontSize="small" />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>Sales Staff</Typography>
                      <Typography variant="caption" color="text.secondary">Billing and products only</Typography>
                    </Box>
                  </Stack>
                </MenuItem>
              </TextField>
            )} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={createForm.handleSubmit(handleCreate)} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={0.5}>
            <Controller name="name" control={editForm.control} render={({ field }) => (
              <TextField {...field} label="Full Name *" size="small" fullWidth
                error={!!editForm.formState.errors.name}
                helperText={editForm.formState.errors.name?.message} />
            )} />
            <Controller name="role" control={editForm.control} render={({ field }) => (
              <TextField {...field} select label="Role *" size="small" fullWidth>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="sales">Sales Staff</MenuItem>
              </TextField>
            )} />
            <Controller name="isActive" control={editForm.control} render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                label={field.value ? 'Active' : 'Inactive'}
              />
            )} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTarget(null)}>Cancel</Button>
          <Button variant="contained" onClick={editForm.handleSubmit(handleEdit)} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Reset Password Dialog ── */}
      <Dialog open={!!passwordTarget} onClose={() => setPasswordTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reset Password — {passwordTarget?.name}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={0.5}>
            <Controller name="newPassword" control={passwordForm.control} render={({ field }) => (
              <TextField {...field} label="New Password *" size="small" fullWidth
                type={showNewPassword ? 'text' : 'password'}
                error={!!passwordForm.formState.errors.newPassword}
                helperText={passwordForm.formState.errors.newPassword?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowNewPassword(!showNewPassword)}>
                        {showNewPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }} />
            )} />
            <Controller name="confirmPassword" control={passwordForm.control} render={({ field }) => (
              <TextField {...field} label="Confirm Password *" size="small" fullWidth
                type={showNewPassword ? 'text' : 'password'}
                error={!!passwordForm.formState.errors.confirmPassword}
                helperText={passwordForm.formState.errors.confirmPassword?.message} />
            )} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordTarget(null)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={passwordForm.handleSubmit(handleResetPassword)} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete User"
        message={`Delete "${deleteTarget?.name}"? They will lose access immediately.`}
        confirmLabel="Delete"
        severity="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
