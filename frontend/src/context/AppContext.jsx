import React, { createContext, useReducer, useContext } from 'react';

const initialState = {
  activeCountry: 'canberra',
  activePollutant: 'CO',
  aqiTier: 'Good',
  coPpm: 0,
  activeValue: 0,
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_ACTIVE_COUNTRY':
      return { ...state, activeCountry: action.payload };
    case 'SET_ACTIVE_POLLUTANT':
      return { ...state, activePollutant: action.payload };
    case 'SET_AQI_DATA':
      return { 
        ...state, 
        aqiTier: action.payload.tier, 
        coPpm: action.payload.coPpm !== undefined ? action.payload.coPpm : action.payload.activeValue,
        activeValue: action.payload.activeValue !== undefined ? action.payload.activeValue : action.payload.coPpm 
      };
    default:
      return state;
  }
}

const AppContext = createContext();

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
