import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function FoodTabs({ activeFood, onSelectFood }) {
  const { foods, selectedFood, switchActiveFood } = useApp();

  const current = activeFood || selectedFood;

  const handleTabClick = (e, key) => {
    e.preventDefault();
    if (onSelectFood) {
      onSelectFood(key);
    } else {
      switchActiveFood(key);
    }
  };

  return (
    <div className="food-tabs-container">
      <div className="food-tabs">
        {(foods || []).map(f => (
          <a
            key={f.key}
            className={`food-tab ${current === f.key ? 'selected' : ''}`}
            href={`?food=${encodeURIComponent(f.key)}`}
            onClick={(e) => handleTabClick(e, f.key)}
          >
            <span className="tab-icon">{f.icon}</span>
            <span className="tab-name">{f.name}</span>
          </a>
        ))}
        <Link className="food-tab tab-add" to="/food-types" title="Add custom food profile">
          <span>＋</span> Manage Profiles
        </Link>
      </div>
    </div>
  );
}
