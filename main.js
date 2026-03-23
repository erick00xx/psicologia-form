// --- CONFIGURACIÓN ---
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwcRgFCo_cwGWNRIkwJhlP-KAPnl2FBdyE-tPBEYbkD-6mx_whbHJN03qy7Q8Qb42Yb/exec';

// Multi-tenant configuration
const urlParams = new URLSearchParams(window.location.search);

const tenant = urlParams.get('tenant') || 'neumann'; // "neumann" o "empresa"
// const tenant = 'neumann';
// const tenant = 'empresa';

document.body.setAttribute('data-tenant', tenant);
const currInstituto = tenant === 'empresa' ? 'Instituto de la Empresa' : 'Jhonn Vonn Neumann';
document.getElementById('hidden-instituto').value = currInstituto;

if (tenant === 'empresa') {
  document.getElementById('splash-logo').src = 'https://cdn.bitrix24.es/b15495391/landing/7a8/7a88860fb02485c824de9be805faee6d/ie_1x.png';
  document.getElementById('header-logo').src = 'https://cdn.bitrix24.es/b15495391/landing/7a8/7a88860fb02485c824de9be805faee6d/ie_1x.png'; //https://i.postimg.cc/cCRd72MJ/unnamed-(1)-(1).jpg
  document.getElementById('sidebar-logo').src = 'https://cdn.bitrix24.es/b15495391/landing/7a8/7a88860fb02485c824de9be805faee6d/ie_1x.png';  //'https://lh3.googleusercontent.com/a-/ALV-UjXPKtsLTepQWQmFSGHqytswW4w4BJnWkNPwXUzWp719hw98gvg=s80-c-mo';  
  document.getElementById('splash-title').innerText = 'Bienestar Corporativo';
  document.getElementById('info-horario-texto').innerText = 'Lunes a Viernes: 12:00 PM - 1:00 PM y 8:00 PM - 9:00 PM.';
} else {
  document.getElementById('info-horario-texto').innerText = 'Lunes a Viernes: 8:00 AM - 12:00 PM y 5:00 PM - 8:00 PM.';
}

let diasDisponibles = [];
let currentSelectedDate = null;
let currentSelectedTimeObj = null;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
  // Simulando carga de datos de Google Apps Script o Fetching
  fetchDisponibilidad();

  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('btn-done').addEventListener('click', () => {
    closeModal();
    window.location.reload();
  });
  
  document.getElementById('btn-entendido-info').addEventListener('click', () => {
    document.getElementById('info-modal-overlay').style.display = 'none';
  });

  // Forzar mayúsculas en el input de ciclo en tiempo real
  const inputCiclo = document.getElementById('ciclo');
  if(inputCiclo) {
    inputCiclo.addEventListener('input', function() {
      this.value = this.value.toUpperCase();
    });
  }

  configurarModalidadPorTenant();
});

function configurarModalidadPorTenant() {
  const modalidadVisible = document.getElementById('modalidad-visible');
  const hiddenModalidad = document.getElementById('hidden-modalidad');
  if (!modalidadVisible || !hiddenModalidad) return;

  if (tenant === 'empresa') {
    modalidadVisible.value = 'Virtual';
    modalidadVisible.disabled = true;
    hiddenModalidad.value = 'Virtual';
  } else {
    modalidadVisible.disabled = false;
    modalidadVisible.value = 'Presencial';
    hiddenModalidad.value = 'Presencial';
  }

  modalidadVisible.onchange = () => {
    hiddenModalidad.value = modalidadVisible.value;
  };
}

function fetchDisponibilidad() {
  document.body.classList.remove('has-selected-date');
  fetch(`${WEB_APP_URL}?action=getAvailability&tenant=${tenant}`)
    .then(res => res.json())
    .then(data => {
      diasDisponibles = data;
      renderDateCarousel(diasDisponibles);
      
      const splash = document.getElementById('splash');
      splash.style.opacity = '0';
      setTimeout(() => {
        splash.style.display = 'none';
        document.getElementById('info-modal-overlay').style.display = 'flex';
      }, 300);
    })
    .catch(err => {
      console.error(err);
      showToast('Error al cargar disponibilidad.');
      // Fallback local for testing/mocking
      diasDisponibles = generateMockData();
      renderDateCarousel(diasDisponibles);
      const splash = document.getElementById('splash');
      splash.style.opacity = '0';
      setTimeout(() => {
        splash.style.display = 'none';
        document.getElementById('info-modal-overlay').style.display = 'flex';
      }, 300);
    });
}

function renderDateCarousel(dias) {
  const carousel = document.getElementById('date-carousel');
  carousel.innerHTML = '';

  dias.forEach((diaInfo, index) => {
    // diaInfo.fechaStr comes as "sáb, 17 mar"
    const parts = diaInfo.fechaStr.split(', ');
    const dayName = parts[0]; // sáb
    const numMonth = parts[1].split(' '); // 17 mar
    
    const chip = document.createElement('div');
    chip.className = 'date-chip';
    chip.dataset.index = index;
    chip.innerHTML = `
      <span class="day-name">${dayName}</span>
      <span class="day-num">${numMonth[0]}</span>
      <span class="month">${numMonth[1]}</span>
    `;
    
    chip.addEventListener('click', () => {
      document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      renderTimeGrid(diaInfo);
    });
    
    carousel.appendChild(chip);
  });

  // Enable mouse drag scrolling for desktop
  let isDown = false;
  let startX;
  let scrollLeft;

  carousel.addEventListener('mousedown', (e) => {
    isDown = true;
    carousel.classList.add('active');
    startX = e.pageX - carousel.offsetLeft;
    scrollLeft = carousel.scrollLeft;
  });
  carousel.addEventListener('mouseleave', () => {
    isDown = false;
    carousel.classList.remove('active');
  });
  carousel.addEventListener('mouseup', () => {
    isDown = false;
    carousel.classList.remove('active');
  });
  carousel.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - carousel.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    carousel.scrollLeft = scrollLeft - walk;
  });

  // Enable mouse wheel horizontal scroll
  carousel.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      carousel.scrollLeft += e.deltaY;
    }
  });
}

function renderTimeGrid(diaInfo) {
  const timeSection = document.getElementById('time-section');
  const timeGrid = document.getElementById('time-grid');
  const dateText = document.getElementById('selected-date-text');
  
  document.body.classList.add('has-selected-date');
  timeSection.style.display = 'block';
  dateText.innerText = `Horarios para el ${diaInfo.fechaStr}`;
  timeGrid.innerHTML = '';

  diaInfo.slots.forEach(slot => {
    const localTime = new Date(slot.iso).toLocaleTimeString('es-ES', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
    const btn = document.createElement('button');
    btn.className = 'time-btn';
    btn.innerText = localTime;
    
    btn.addEventListener('click', () => {
      openModal(slot, diaInfo.fechaStr, localTime);
    });
    
    timeGrid.appendChild(btn);
  });

  // Scroll to time grid smoothly
  timeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openModal(slot, dateStr, timeStr) {
  currentSelectedTimeObj = slot;
  document.getElementById('hidden-datetime').value = slot.iso;
  document.getElementById('modal-datetime-info').innerText = `${dateStr} a las ${timeStr}`;
  
  const modalObj = document.getElementById('modal-overlay');
  modalObj.style.display = 'flex';
  document.getElementById('appointment-form').style.display = 'block';
  document.getElementById('success-state').style.display = 'none';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.getElementById('appointment-form').reset();
  configurarModalidadPorTenant();
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.innerText = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Lógica de Envío del Formulario
document.getElementById('appointment-form').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const btn = document.getElementById('btn-submit');
  btn.innerText = 'Procesando...';
  btn.disabled = true;

  const formData = new FormData(this);
  const data = Object.fromEntries(formData.entries());

  fetch(WEB_APP_URL, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    }
  })
  .then(res => res.json())
  .then(result => {
    if(result.status === 'ok') {
      showToast('Cita reservada con éxito');
      document.getElementById('appointment-form').style.display = 'none';
      document.getElementById('success-state').style.display = 'block';
    } else {
      showToast('Error: ' + result.msg);
    }
  })
  .catch(err => {
    showToast('Error de conexión');
    console.error(err);
  })
  .finally(() => {
    btn.innerText = 'Agendar Cita';
    btn.disabled = false;
  });
});

// Mocked availability function to use if backend fails during testing
function generateMockData() {
  const data = [];
  const now = new Date();

  const bloques = tenant === 'empresa'
    ? [{ inicio: 12, fin: 13 }, { inicio: 20, fin: 21 }]
    : [{ inicio: 8, fin: 12 }, { inicio: 17, fin: 20 }];

  for(let i=1; i<=14; i++) {
    const d = new Date(now.getTime() + i*86400000);
    if(d.getDay() === 0 || d.getDay() === 6) continue;
    const str = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

    const slots = [];
    bloques.forEach(bloque => {
      for (let h = bloque.inicio; h < bloque.fin; h++) {
        slots.push({ iso: new Date(new Date(d).setHours(h, 0, 0, 0)).toISOString() });
      }
    });

    data.push({
      fechaStr: str,
      slots
    });
  }
  return data;
}