/* ============================================
   Weather Finder — UAPI Weather API
   Endpoint: https://uapis.cn/api/v1/misc/weather
   No API key required. Fetches by city name.
   ============================================ */

(function () {
  'use strict';

  // Map UAPI weather_icon codes to emoji + label
  // Codes follow the QWeather icon convention (100–508)
  var WEATHER_ICONS = {
    // Sunny / clear
    '100': { emoji: '☀️', label: 'Sunny' },
    // Cloudy
    '101': { emoji: '⛅', label: 'Partly cloudy' },
    '102': { emoji: '⛅', label: 'Partly cloudy' },
    '103': { emoji: '⛅', label: 'Mostly cloudy' },
    '104': { emoji: '☁️', label: 'Overcast' },
    '105': { emoji: '☁️', label: 'Overcast' },
    '106': { emoji: '☁️', label: 'Overcast' },
    // Windy / sand
    '200': { emoji: '💨', label: 'Windy' },
    '201': { emoji: '💨', label: 'Windy' },
    '202': { emoji: '🌪️', label: 'Sandstorm' },
    // Rain
    '300': { emoji: '🌦️', label: 'Light rain' },
    '301': { emoji: '🌧️', label: 'Rain' },
    '302': { emoji: '🌧️', label: 'Moderate rain' },
    '303': { emoji: '🌧️', label: 'Heavy rain' },
    '304': { emoji: '⛈️', label: 'Thunderstorm' },
    '305': { emoji: '⛈️', label: 'Thunderstorm' },
    '306': { emoji: '⛈️', label: 'Thunderstorm' },
    '307': { emoji: '☔', label: 'Heavy thunderstorm' },
    // Snow
    '400': { emoji: '🌨️', label: 'Light snow' },
    '401': { emoji: '❄️', label: 'Snow' },
    '402': { emoji: '❄️', label: 'Moderate snow' },
    '403': { emoji: '❄️', label: 'Heavy snow' },
    '404': { emoji: '🌧️', label: 'Sleet' },
    '405': { emoji: '🌧️', label: 'Sleet' },
    '406': { emoji: '🌧️', label: 'Freezing rain' },
    '407': { emoji: '🌧️', label: 'Freezing rain' },
    // Fog / haze
    '500': { emoji: '🌫️', label: 'Fog' },
    '501': { emoji: '🌫️', label: 'Mist' },
    '502': { emoji: '🌫️', label: 'Fog' },
    '503': { emoji: '🌫️', label: 'Dust' },
    '504': { emoji: '🌫️', label: 'Dust' },
    '507': { emoji: '🌫️', label: 'Haze' },
    '508': { emoji: '🌫️', label: 'Haze' },
  };

  var form = document.getElementById('weatherForm');
  var input = document.getElementById('cityInput');
  var btn = document.getElementById('weatherSearchBtn');
  var btnLabel = btn ? btn.querySelector('.btn-label') : null;
  var result = document.getElementById('weatherResult');

  if (!form || !input || !result) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var city = input.value.trim();

    if (!city) {
      showError('Enter a city first.');
      return;
    }

    fetchWeather(city);
  });

  async function fetchWeather(city) {
    showLoading();
    setButtonBusy(true);

    try {
      // Ask the API for English place names when the user typed Latin characters,
      // so the returned name can be compared with what was typed.
      var useEnglish = /[a-zA-Z]/.test(city);
      var url = 'https://uapis.cn/api/v1/misc/weather?city=' + encodeURIComponent(city)
        + (useEnglish ? '&lang=en' : '');

      var res = await fetch(url);
      if (!res.ok) throw new Error('Network response was not ok');

      var data = await res.json();

      // UAPI returns an error object like {code: "INVALID_PARAMETER", message: "..."}
      if (data.code || !matchesQuery(city, data)) {
        showError('Couldn’t find that city — check the spelling.');
        return;
      }

      showWeather(data);
    } catch (err) {
      showError('Couldn’t find that city — check the spelling.');
    } finally {
      setButtonBusy(false);
    }
  }

  function showLoading() {
    result.className = 'weather-result weather-loading';
    result.innerHTML = '<div class="weather-status">Loading…</div>';
  }

  function showError(msg) {
    result.className = 'weather-result weather-error';
    result.innerHTML = '<div class="weather-status">' + escapeHtml(msg) + '</div>';
  }

  function showWeather(data) {
    var icon = WEATHER_ICONS[data.weather_icon] || { emoji: '🌤️', label: 'Weather' };
    var temp = typeof data.temperature === 'number'
      ? Math.round(data.temperature)
      : data.temperature;
    var condition = data.weather || icon.label;
    var cityName = data.city || data.province || '';
    var province = data.province || '';
    var locationLabel = province && province !== cityName
      ? province + ' · ' + cityName
      : cityName;

    result.className = 'weather-result weather-card';
    result.innerHTML =
      '<div class="w-icon" role="img" aria-label="' + escapeHtml(icon.label) + '">' + icon.emoji + '</div>' +
      '<div class="w-temp">' + temp + '\u00b0C</div>' +
      '<div class="w-desc">' + escapeHtml(condition) + '</div>' +
      '<div class="w-location">' + escapeHtml(locationLabel) + '</div>' +
      '<div class="w-meta">' +
        '<span>💧 ' + (data.humidity != null ? escapeHtml(data.humidity) + '%' : '—') + '</span>' +
        '<span>💨 ' + escapeHtml(data.wind_direction || '') + (data.wind_power ? ' ' + escapeHtml(data.wind_power) : '') + '</span>' +
      '</div>';
  }

  function setButtonBusy(busy) {
    if (!btn) return;
    btn.disabled = busy;
    btn.classList.toggle('is-busy', busy);
    if (btnLabel) {
      btnLabel.textContent = busy ? 'Searching…' : 'Search';
    }
  }

  function escapeHtml(str) {
    if (str == null || str === '') return '';
    var div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  // UAPI fuzzy-matches unknown input and silently falls back to some city,
  // so confirm the response actually refers to the city that was typed.
  function matchesQuery(city, data) {
    var q = normalize(city);
    if (!q) return false;

    var candidates = [data.city, data.district, data.province]
      .map(normalize)
      .filter(Boolean);

    return candidates.some(function (name) {
      return name === q || name.indexOf(q) !== -1 || q.indexOf(name) !== -1;
    });
  }

  function normalize(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\u4e00-\u9fff]/g, '');
  }
})();
