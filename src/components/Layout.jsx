import React from 'react';
import Navbar from './Navbar';

export default function Test({ children }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-red-200 via-orange-200 to-red-300">
            <Navbar />

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-xl p-6">
                    {children}
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-orange-100/30 backdrop-blur-sm py-4 mt-auto">
                <div className="container mx-auto px-4 text-center text-orange-800">
                    <p>© 2024 Talks from the Heart. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}