import * as ExpoLinking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { Case } from '@/lib/cases/case';
import { apiClient } from '@/lib/apiClient';

interface CasesState {
  loaded: boolean;
  cases: Case[];
  error: boolean;

  loadAndGetCases: () => Case[];
}

export const useCasesStore = create<CasesState>((set, get) => ({
  loaded: false,
  cases: [],
  error: false,

  loadAndGetCases: () => {
    if (get().loaded) {
      return get().cases;
    } else {
      apiClient.api
        .getCasesApiCasesGet()
        .then((cases) => {
          const mappedCases = cases.data.cases.map((c) => {
            const caseModel = new Case({
              id: c.id,
              patientName: c.patient_name,
              title: c.title,
              patientAge: c.patient_age,
              patientOccupation: c.patient_occupation,
            });
            caseModel.id = c.id;
            caseModel.patientName = c.patient_name;

            return caseModel;
          });
          set({ cases: mappedCases, loaded: true, error: false });
        })
        .catch((error) => {
          console.error('Failed to load cases:', error);
          set({ error: true, loaded: false });
        });
    }
    return [];
  },
}));
