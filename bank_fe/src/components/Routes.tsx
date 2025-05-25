import { Route, Routes} from 'react-router-dom';
import SignupPage from '../pages/SignupPage';
import LoginPage from '../pages/LoginPage';
import VerifyPage from '../pages/VerifyPage';
import HomePage from "../pages/HomePage";
import ProtectedRoutes from './ProtectedRoutes';
import DashboardPage from '../pages/DashboardPage';
import TransferPage from '../pages/TransferPage';

function AppRoutes() {
    return (
        <Routes>
            {/*public*/}
            <Route path='/' element={<HomePage />} />
            <Route path='/signup' element={<SignupPage />} />
            <Route path='/login' element={<LoginPage />} />
            <Route path='/verify' element={<VerifyPage />} />

            {/*protected*/}
            <Route element={<ProtectedRoutes />} >
                <Route path='/dashboard' element={<DashboardPage />} />
                <Route path='/transfer' element={<TransferPage />} />
            </Route>
        </Routes>
    )
}

export default AppRoutes;