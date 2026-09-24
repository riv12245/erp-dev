import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BusinessScreen } from '../business/BusinessScreen';
export function SalesScreen(): React.JSX.Element { const navigate = useNavigate(); return <BusinessScreen area="sales" onDashboard={() => navigate('/')} />; }
