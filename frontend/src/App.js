import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';
import UserBehaviorMonitoringPage from "./pages/UserBehaviorMonitoringPage";
import UserProfilePage from "./pages/UserProfilePage"; // Import UserProfilePage
import WeightConfigPage from "./pages/WeightConfigPage"; // Import UserProfilePage

const App = () => {
    return (
        <Router>
            <div>
                <Header />
                <main>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/product" element={<ProductPage />} />
                        <Route path="/monitoring" element={<UserBehaviorMonitoringPage />} />
                        <Route path="/user-profile" element={<UserProfilePage />} />
                        <Route path="/weight-config" element={<WeightConfigPage />} />
                    </Routes>
                </main>
                <Footer />
            </div>
        </Router>
    );
};

export default App;