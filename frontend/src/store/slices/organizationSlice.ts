import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OrgState, Organization, MemberRole } from '../../types';

const savedOrgId = localStorage.getItem('currentOrgId');

const initialState: OrgState = {
  currentOrg: null,
  organizations: [],
  currentRole: null,
};

const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {
    setOrganizations: (state, action: PayloadAction<Organization[]>) => {
      state.organizations = action.payload;
      if (!state.currentOrg && action.payload.length > 0) {
        const saved = savedOrgId ? action.payload.find((o) => o.id === savedOrgId) : null;
        state.currentOrg = saved || action.payload[0];
      }
    },
    switchOrganization: (state, action: PayloadAction<Organization>) => {
      state.currentOrg = action.payload;
      state.currentRole = null;
      localStorage.setItem('currentOrgId', action.payload.id);
    },
    setCurrentRole: (state, action: PayloadAction<MemberRole>) => {
      state.currentRole = action.payload;
    },
    addOrganization: (state, action: PayloadAction<Organization>) => {
      state.organizations.push(action.payload);
      state.currentOrg = action.payload;
      localStorage.setItem('currentOrgId', action.payload.id);
    },
    clearOrganizations: (state) => {
      state.organizations = [];
      state.currentOrg = null;
      state.currentRole = null;
      localStorage.removeItem('currentOrgId');
    },
  },
});

export const { setOrganizations, switchOrganization, setCurrentRole, addOrganization, clearOrganizations } = organizationSlice.actions;
export default organizationSlice.reducer;
