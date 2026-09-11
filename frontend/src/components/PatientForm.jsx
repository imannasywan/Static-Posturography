import React, { useState } from 'react';

export default function PatientForm({ onBack, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    gender: 'Laki-laki',
    age: '',
    height: '',
    weight: '',
    hasBalanceDisorder: 'Tidak'
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Simple validation
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Nama lengkap wajib diisi';
    if (!formData.age || formData.age <= 0) newErrors.age = 'Usia valid wajib diisi';
    if (!formData.height || formData.height <= 0) newErrors.height = 'Tinggi badan valid wajib diisi';
    if (!formData.weight || formData.weight <= 0) newErrors.weight = 'Berat badan valid wajib diisi';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="fade-in">
      <button className="btn-text" onClick={onBack} style={{ marginBottom: '20px' }}>
        {/* Back Arrow */}
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Kembali ke Dashboard
      </button>

      <div className="form-box">
        <form onSubmit={handleSubmit}>
          <div className="form-header">
            <div className="form-icon-circle">
              {/* User icon with checkmark */}
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <polyline points="16 11 18 13 22 9" />
              </svg>
            </div>
            <h2>Data Identitas Pemeriksaan</h2>
            <p>Lengkapi data diri Anda sebelum memulai pemeriksaan</p>
          </div>

          <div className="form-group">
            <label htmlFor="name">Nama Lengkap <span>*</span></label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-control"
              placeholder="Masukkan nama lengkap"
              value={formData.name}
              onChange={handleChange}
            />
            {errors.name && <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', display: 'block' }}>{errors.name}</span>}
          </div>

          <div className="form-group">
            <label>Jenis Kelamin <span>*</span></label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="gender"
                  value="Laki-laki"
                  checked={formData.gender === 'Laki-laki'}
                  onChange={handleChange}
                />
                Laki-laki
              </label>
              
              <label className="radio-option">
                <input
                  type="radio"
                  name="gender"
                  value="Perempuan"
                  checked={formData.gender === 'Perempuan'}
                  onChange={handleChange}
                />
                Perempuan
              </label>
            </div>
          </div>

          <div className="form-row-3">
            <div className="form-group">
              <label htmlFor="age">Usia <span>*</span></label>
              <div className="form-unit-group">
                <input
                  type="number"
                  id="age"
                  name="age"
                  className="form-control"
                  placeholder="0"
                  min="1"
                  max="120"
                  value={formData.age}
                  onChange={handleChange}
                />
                <span className="form-unit-label">tahun</span>
              </div>
              {errors.age && <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '4px', display: 'block' }}>{errors.age}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="height">Tinggi Badan <span>*</span></label>
              <div className="form-unit-group">
                <input
                  type="number"
                  id="height"
                  name="height"
                  className="form-control"
                  placeholder="0"
                  min="30"
                  max="250"
                  value={formData.height}
                  onChange={handleChange}
                />
                <span className="form-unit-label">cm</span>
              </div>
              {errors.height && <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '4px', display: 'block' }}>{errors.height}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="weight">Berat Badan <span>*</span></label>
              <div className="form-unit-group">
                <input
                  type="number"
                  id="weight"
                  name="weight"
                  className="form-control"
                  placeholder="0"
                  min="5"
                  max="300"
                  value={formData.weight}
                  onChange={handleChange}
                />
                <span className="form-unit-label">kg</span>
              </div>
              {errors.weight && <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '4px', display: 'block' }}>{errors.weight}</span>}
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '12px' }}>
            <label>Apakah memiliki kelainan keseimbangan? <span>*</span></label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="hasBalanceDisorder"
                  value="Ya"
                  checked={formData.hasBalanceDisorder === 'Ya'}
                  onChange={handleChange}
                />
                Ya
              </label>
              
              <label className="radio-option">
                <input
                  type="radio"
                  name="hasBalanceDisorder"
                  value="Tidak"
                  checked={formData.hasBalanceDisorder === 'Tidak'}
                  onChange={handleChange}
                />
                Tidak
              </label>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '24px', padding: '14px' }}>
            Mulai Pemeriksaan
          </button>
        </form>
      </div>
    </div>
  );
}
