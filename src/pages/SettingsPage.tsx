import React, { useState } from 'react';
import {
  Box, Grid, Paper, Typography, Stack, TextField, Button,
  Divider, Avatar, Chip, CircularProgress, InputAdornment, IconButton,
} from '@mui/material';
import {
  Person, Lock, Visibility, VisibilityOff,
  Edit as EditIcon, Save as SaveIcon, Close as CloseIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import PageHeader from '../components/common/PageHeader';
import { settingsApi } from '../api/settings';
import { useAuthStore } from '../store/authStore';

// ── Schemas ───────────────────────────────────────────────────────────────────
const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword:     z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string().min(1, 'Required'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword'],
}).refine((d) => d.currentPassword !== d.newPassword, {
  message: 'New password must differ from current', path: ['newPassword'],
});

type ProfileForm  = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Paper sx={{ p: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
        <Box sx={{ color: 'primary.main' }}>{icon}</Box>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
      </Stack>
      <Divider sx={{ mb: 2.5 }} />
      {children}
    </Paper>
  );
}

export default function SettingsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuthStore();

  const [editing, setEditing]           = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrent, setShowCurrent]   = useState(false);
  const [showNew, setShowNew]           = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '' },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  // ── Profile save ──────────────────────────────────────────────────────────
  async function handleProfileSave(data: ProfileForm) {
    setSavingProfile(true);
    try {
      await settingsApi.updateProfile({ name: data.name });
      const stored = localStorage.getItem('erp_user');
      if (stored) {
        localStorage.setItem('erp_user', JSON.stringify({ ...JSON.parse(stored), name: data.name }));
      }
      enqueueSnackbar('Profile updated', { variant: 'success' });
      setEditing(false);
    } catch {
      enqueueSnackbar('Failed to update profile', { variant: 'error' });
    } finally {
      setSavingProfile(false);
    }
  }

  function handleCancelEdit() {
    profileForm.reset({ name: user?.name ?? '' });
    setEditing(false);
  }

  // ── Password save ─────────────────────────────────────────────────────────
  async function handlePasswordSave(data: PasswordForm) {
    setSavingPassword(true);
    try {
      await settingsApi.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      enqueueSnackbar('Password changed successfully', { variant: 'success' });
      passwordForm.reset();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to change password';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <Box>
      <PageHeader title="Settings" subtitle="Manage your account" />

      <Grid container spacing={3}>

        {/* ── Profile card ── */}
        <Grid item xs={12} md={6}>
          <SectionCard title="Profile" icon={<Person />}>

            {/* Avatar + info always visible */}
            <Stack direction="row" spacing={2} alignItems="center" mb={3}>
              <Avatar sx={{ width: 60, height: 60, bgcolor: 'primary.main', fontSize: '1.3rem', fontWeight: 700 }}>
                {user?.name ? initials(user.name) : 'U'}
              </Avatar>
              <Box>
                <Typography variant="body1" fontWeight={700}>{user?.name}</Typography>
                <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
                <Chip
                  label={user?.role === 'admin' ? 'Admin' : 'Sales Staff'}
                  size="small"
                  color={user?.role === 'admin' ? 'primary' : 'default'}
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Stack>

            {!editing ? (
              /* ── Read-only view ── */
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Full Name</Typography>
                  <Typography variant="body2" fontWeight={600}>{user?.name}</Typography>
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Email</Typography>
                  <Typography variant="body2" fontWeight={600}>{user?.email}</Typography>
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Role</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>{user?.role}</Typography>
                </Stack>
                <Box pt={1}>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => { profileForm.reset({ name: user?.name ?? '' }); setEditing(true); }}
                    fullWidth
                  >
                    Edit Profile
                  </Button>
                </Box>
              </Stack>
            ) : (
              /* ── Edit form ── */
              <Stack spacing={2}>
                <Controller name="name" control={profileForm.control} render={({ field }) => (
                  <TextField
                    {...field} label="Full Name" fullWidth size="small" autoFocus
                    error={!!profileForm.formState.errors.name}
                    helperText={profileForm.formState.errors.name?.message}
                  />
                )} />
                <TextField label="Email" value={user?.email ?? ''} fullWidth size="small" disabled helperText="Email cannot be changed" />
                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="contained" fullWidth
                    startIcon={savingProfile ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    disabled={savingProfile}
                    onClick={profileForm.handleSubmit(handleProfileSave)}
                  >
                    Save
                  </Button>
                  <Button variant="outlined" fullWidth startIcon={<CloseIcon />} onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            )}
          </SectionCard>
        </Grid>

        {/* ── Change Password card ── */}
        <Grid item xs={12} md={6}>
          <SectionCard title="Change Password" icon={<Lock />}>
            <Stack spacing={2}>
              <Controller name="currentPassword" control={passwordForm.control} render={({ field }) => (
                <TextField
                  {...field} label="Current Password" fullWidth size="small"
                  type={showCurrent ? 'text' : 'password'}
                  error={!!passwordForm.formState.errors.currentPassword}
                  helperText={passwordForm.formState.errors.currentPassword?.message}
                  InputProps={{ endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowCurrent(!showCurrent)}>
                        {showCurrent ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  )}}
                />
              )} />
              <Controller name="newPassword" control={passwordForm.control} render={({ field }) => (
                <TextField
                  {...field} label="New Password" fullWidth size="small"
                  type={showNew ? 'text' : 'password'}
                  error={!!passwordForm.formState.errors.newPassword}
                  helperText={passwordForm.formState.errors.newPassword?.message}
                  InputProps={{ endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowNew(!showNew)}>
                        {showNew ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  )}}
                />
              )} />
              <Controller name="confirmPassword" control={passwordForm.control} render={({ field }) => (
                <TextField
                  {...field} label="Confirm New Password" fullWidth size="small"
                  type={showNew ? 'text' : 'password'}
                  error={!!passwordForm.formState.errors.confirmPassword}
                  helperText={passwordForm.formState.errors.confirmPassword?.message}
                />
              )} />
              <Button
                variant="outlined" color="warning" fullWidth
                startIcon={savingPassword ? <CircularProgress size={16} color="inherit" /> : <Lock />}
                disabled={savingPassword}
                onClick={passwordForm.handleSubmit(handlePasswordSave)}
              >
                {savingPassword ? 'Saving…' : 'Change Password'}
              </Button>
            </Stack>
          </SectionCard>
        </Grid>

      </Grid>
    </Box>
  );
}
