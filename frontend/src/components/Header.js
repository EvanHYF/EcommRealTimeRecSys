import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
    return (
        <header>
            <nav>
                <ul>
                    <li><Link to="/">Home</Link></li>
                    <li><Link to="/product">Product</Link></li>
                    <li><Link to="/monitoring">Monitoring</Link></li>
                    <li><Link to="/user-profile">User Profile</Link></li>
                    <li><Link to="/weight-config">Weight Configuration</Link></li>
                </ul>
            </nav>
        </header>
    );
};

export default Header;