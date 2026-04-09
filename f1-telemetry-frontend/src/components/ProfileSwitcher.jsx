import React, { useState, useEffect } from 'react';

const ProfileSwitcher = ({ socket, p2Active }) => {
    const [users, setUsers] = useState([{ name: 'Guest' }]);
    const [activeP1, setActiveP1] = useState('Guest');
    const [activeP2, setActiveP2] = useState('Guest');
    const [showNewInput, setShowNewInput] = useState(false);
    const [newName, setNewName] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        socket.on('USER_LIST_UPDATE', (userList) => {
            setUsers(userList);
        });

        socket.on('ERROR', (msg) => {
            setError(msg);
            setTimeout(() => setError(''), 3000);
        });

        socket.emit('GET_USERS');

        return () => {
            socket.off('USER_LIST_UPDATE');
            socket.off('ERROR');
        };
    }, [socket]);

    useEffect(() => {
        // Broadcast active profiles to backend whenever they change
        socket.emit('SET_PROFILES', { p1: activeP1, p2: p2Active ? activeP2 : null });
    }, [activeP1, activeP2, p2Active, socket]);

    const handleAddUser = (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        socket.emit('ADD_USER', newName.trim());
        setNewName('');
        setShowNewInput(false);
    };

    return (
        <div className="profile-switcher-container">
            {error && <div className="profile-error">{error}</div>}
            
            <div className="profile-group">
                <div className="profile-select-wrapper">
                    <span className="profile-label">P1 PROFILE:</span>
                    <select 
                        value={activeP1} 
                        onChange={(e) => setActiveP1(e.target.value)}
                        className="profile-select"
                    >
                        {users.map(u => (
                            <option key={u.name} value={u.name}>{u.name}</option>
                        ))}
                    </select>
                </div>

                {p2Active && (
                    <div className="profile-select-wrapper">
                        <span className="profile-label">P2 PROFILE:</span>
                        <select 
                            value={activeP2} 
                            onChange={(e) => setActiveP2(e.target.value)}
                            className="profile-select"
                        >
                            {users.map(u => (
                                <option key={u.name} value={u.name}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {users.length < 4 && !showNewInput && (
                <button className="add-profile-btn" onClick={() => setShowNewInput(true)}>
                    + NEW
                </button>
            )}

            {showNewInput && (
                <form className="new-profile-form" onSubmit={handleAddUser}>
                    <input 
                        autoFocus
                        type="text" 
                        placeholder="NAME..." 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)}
                        maxLength={12}
                    />
                    <button type="submit">OK</button>
                    <button type="button" onClick={() => setShowNewInput(false)}>X</button>
                </form>
            )}
        </div>
    );
};

export default ProfileSwitcher;
