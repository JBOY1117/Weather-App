const DEFAULT_CITY = {
  name: "Reykjavik",
  country: "Iceland",
  latitude: 64.1466,
  longitude: -21.9426
};

const STORAGE_KEYS = {
  lastCity: "weatherly:lastCity",
  unit: "weatherly:unit"
};

const state = {
  unit: localStorage.getItem(STORAGE_KEYS.unit) || "metric",
  latestWeather: null,
  latestPlace: null
};

const searchForm = document.querySelector("#searchForm");
const citySearch = document.querySelector("#citySearch");
const searchButton = document.querySelector("#searchButton");
const formFeedback = document.querySelector("#formFeedback");
const hourlyForecast = document.querySelector("#hourlyForecast");
const dailyForecast = document.querySelector("#dailyForecast");
const currentCity = document.querySelector("#currentCity");
const currentTime = document.querySelector("#currentTime");
const currentTemp = document.querySelector("#currentTemp");
const currentCondition = document.querySelector("#currentCondition");
const currentIcon = document.querySelector("#currentIcon");
const feelsLike = document.querySelector("#feelsLike");
const todaySummary = document.querySelector("#todaySummary");
const todayDetail = document.querySelector("#todayDetail");
const todayHigh = document.querySelector("#todayHigh");
const todayLow = document.querySelector("#todayLow");
const humidityValue = document.querySelector("#humidityValue");
const humidityHint = document.querySelector("#humidityHint");
const windValue = document.querySelector("#windValue");
const windHint = document.querySelector("#windHint");
const uvValue = document.querySelector("#uvValue");
const airValue = document.querySelector("#airValue");
const unitButtons = document.querySelectorAll(".unit-button");

function describeWeather(code, isDay = true) {
  const descriptions = {
    0: { text: isDay ? "Sunny" : "Clear night", icon: isDay ? "☀" : "☾", theme: isDay ? "theme-clear" : "theme-night" },
    1: { text: "Mostly clear", icon: isDay ? "🌤" : "☾", theme: isDay ? "theme-clear" : "theme-night" },
    2: { text: "Partly cloudy", icon: "🌤", theme: isDay ? "theme-cloud" : "theme-night" },
    3: { text: "Cloudy", icon: "☁", theme: isDay ? "theme-cloud" : "theme-night" },
    45: { text: "Foggy", icon: "≋", theme: "theme-fog" },
    48: { text: "Rime fog", icon: "≋", theme: "theme-fog" },
    51: { text: "Light drizzle", icon: "🌦", theme: "theme-rain" },
    53: { text: "Drizzle", icon: "🌦", theme: "theme-rain" },
    55: { text: "Heavy drizzle", icon: "🌧", theme: "theme-rain" },
    56: { text: "Freezing drizzle", icon: "🌧", theme: "theme-rain" },
    57: { text: "Freezing drizzle", icon: "🌧", theme: "theme-rain" },
    61: { text: "Light rain", icon: "🌧", theme: "theme-rain" },
    63: { text: "Rainy", icon: "🌧", theme: "theme-rain" },
    65: { text: "Heavy rain", icon: "🌧", theme: "theme-rain" },
    66: { text: "Freezing rain", icon: "🌧", theme: "theme-rain" },
    67: { text: "Freezing rain", icon: "🌧", theme: "theme-rain" },
    71: { text: "Light snow", icon: "❄", theme: "theme-snow" },
    73: { text: "Snowy", icon: "❄", theme: "theme-snow" },
    75: { text: "Heavy snow", icon: "❄", theme: "theme-snow" },
    77: { text: "Snow grains", icon: "❄", theme: "theme-snow" },
    80: { text: "Rain showers", icon: "🌦", theme: "theme-rain" },
    81: { text: "Rain showers", icon: "🌧", theme: "theme-rain" },
    82: { text: "Heavy showers", icon: "🌧", theme: "theme-rain" },
    85: { text: "Snow showers", icon: "❄", theme: "theme-snow" },
    86: { text: "Heavy snow showers", icon: "❄", theme: "theme-snow" },
    95: { text: "Thunderstorm", icon: "ϟ", theme: "theme-storm" },
    96: { text: "Storm with hail", icon: "ϟ", theme: "theme-storm" },
    99: { text: "Severe storm", icon: "ϟ", theme: "theme-storm" }
  };

  return descriptions[code] || { text: "Variable conditions", icon: "◌", theme: isDay ? "theme-cloud" : "theme-night" };
}

function celsiusToFahrenheit(value) {
  return (value * 9) / 5 + 32;
}

function formatTemperature(value) {
  const converted = state.unit === "imperial" ? celsiusToFahrenheit(value) : value;
  return `${Math.round(converted)}°`;
}

function formatWind(value) {
  if (state.unit === "imperial") {
    return `${Math.round(value * 0.621371)} mph`;
  }

  return `${Math.round(value)} km/h`;
}

function formatDay(dateString, index) {
  if (index === 0) {
    return "Today";
  }

  return new Intl.DateTimeFormat("en", { weekday: "short" }).format(new Date(`${dateString}T12:00:00`));
}

function formatHour(dateString, index) {
  if (index === 0) {
    return "Now";
  }

  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date(dateString));
}

function setLoading(isLoading, message = "") {
  document.body.classList.toggle("is-loading", isLoading);
  searchButton.disabled = isLoading;
  citySearch.disabled = isLoading;
  formFeedback.textContent = message;
}

function setTheme(theme) {
  document.body.classList.remove("theme-clear", "theme-rain", "theme-night", "theme-cloud", "theme-fog", "theme-snow", "theme-storm");
  document.body.classList.add(theme);
}

async function fetchJson(url, errorMessage) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  return response.json();
}

async function geocodeCity(city) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({
    name: city,
    count: "1",
    language: "en",
    format: "json"
  });

  const data = await fetchJson(url, "Could not search for that city.");

  if (!data.results || data.results.length === 0) {
    throw new Error("City not found, please try again.");
  }

  const [result] = data.results;
  return {
    name: result.name,
    country: result.country,
    admin: result.admin1,
    latitude: result.latitude,
    longitude: result.longitude
  };
}

async function fetchWeather(latitude, longitude) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude,
    longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m",
    hourly: "temperature_2m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    forecast_days: "5",
    timezone: "auto"
  });

  return fetchJson(url, "Weather service is unavailable. Please try again.");
}

function renderHourlyForecast(weather) {
  const currentHour = new Date(weather.current.time).getHours();
  const startIndex = weather.hourly.time.findIndex((time) => new Date(time).getHours() === currentHour);
  const safeStartIndex = Math.max(startIndex, 0);
  const hours = weather.hourly.time.slice(safeStartIndex, safeStartIndex + 24);

  hourlyForecast.innerHTML = hours.map((time, offset) => {
    const index = safeStartIndex + offset;
    const meta = describeWeather(weather.hourly.weather_code[index], weather.current.is_day === 1);

    return `
      <div class="hour-card">
        <time>${formatHour(time, offset)}</time>
        <span class="icon" aria-hidden="true">${meta.icon}</span>
        <strong>${formatTemperature(weather.hourly.temperature_2m[index])}</strong>
      </div>
    `;
  }).join("");
}

function renderDailyForecast(weather) {
  dailyForecast.innerHTML = weather.daily.time.map((date, index) => {
    const meta = describeWeather(weather.daily.weather_code[index], true);

    return `
      <div class="day-row">
        <span class="day-name">${formatDay(date, index)}</span>
        <span class="day-icon" aria-hidden="true">${meta.icon}</span>
        <span class="day-condition">${meta.text}</span>
        <span class="day-temp">${formatTemperature(weather.daily.temperature_2m_max[index])} / ${formatTemperature(weather.daily.temperature_2m_min[index])}</span>
      </div>
    `;
  }).join("");
}

function renderWeather(place, weather) {
  const current = weather.current;
  const currentMeta = describeWeather(current.weather_code, current.is_day === 1);
  const displayPlace = [place.name, place.admin, place.country].filter(Boolean).join(", ");
  const updateDate = new Date(current.time);

  state.latestWeather = weather;
  state.latestPlace = place;

  setTheme(currentMeta.theme);
  currentCity.textContent = displayPlace;
  currentTime.textContent = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(updateDate);
  currentTemp.textContent = formatTemperature(current.temperature_2m);
  currentCondition.textContent = currentMeta.text;
  currentIcon.textContent = currentMeta.icon;
  feelsLike.textContent = `Feels like ${formatTemperature(current.apparent_temperature)} · Wind ${formatWind(current.wind_speed_10m)}`;

  todaySummary.textContent = `${currentMeta.text} right now`;
  todayDetail.textContent = `Live Open-Meteo forecast for ${displayPlace}.`;
  todayHigh.textContent = formatTemperature(weather.daily.temperature_2m_max[0]);
  todayLow.textContent = formatTemperature(weather.daily.temperature_2m_min[0]);

  humidityValue.textContent = `${Math.round(current.relative_humidity_2m)}%`;
  humidityHint.textContent = current.relative_humidity_2m > 75 ? "Humid air" : "Comfortable range";
  windValue.textContent = formatWind(current.wind_speed_10m);
  windHint.textContent = current.wind_speed_10m > 28 ? "Windy conditions" : "10 m wind speed";
  uvValue.textContent = "N/A";
  airValue.textContent = "N/A";

  renderHourlyForecast(weather);
  renderDailyForecast(weather);
}

async function loadWeatherForPlace(place, options = {}) {
  const message = options.message || `Loading weather for ${place.name}...`;
  setLoading(true, message);

  try {
    const weather = await fetchWeather(place.latitude, place.longitude);
    renderWeather(place, weather);

    if (options.persistCity) {
      localStorage.setItem(STORAGE_KEYS.lastCity, place.name);
      citySearch.value = place.name;
    }

    formFeedback.textContent = "Live weather updated.";
  } catch (error) {
    formFeedback.textContent = error.message;
  } finally {
    setLoading(false, formFeedback.textContent);
  }
}

async function loadWeatherForCity(city) {
  const cleanCity = city.trim();

  if (cleanCity.length < 2) {
    formFeedback.textContent = "Please enter at least two characters.";
    return;
  }

  setLoading(true, `Finding ${cleanCity}...`);

  try {
    const place = await geocodeCity(cleanCity);
    await loadWeatherForPlace(place, { persistCity: true, message: `Loading weather for ${place.name}...` });
  } catch (error) {
    formFeedback.textContent = error.message;
    setLoading(false, error.message);
  }
}

function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not available in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 300000
    });
  });
}

async function initializeWeather() {
  const savedCity = localStorage.getItem(STORAGE_KEYS.lastCity);

  if (savedCity) {
    citySearch.value = savedCity;
    await loadWeatherForCity(savedCity);
    return;
  }

  try {
    setLoading(true, "Requesting your location...");
    const position = await getBrowserLocation();
    const place = {
      name: "Your location",
      country: "",
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    };

    await loadWeatherForPlace(place, { message: "Loading weather near you..." });
  } catch {
    citySearch.value = DEFAULT_CITY.name;
    await loadWeatherForPlace(DEFAULT_CITY, {
      persistCity: true,
      message: "Location unavailable. Loading Reykjavik..."
    });
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadWeatherForCity(citySearch.value);
});

unitButtons.forEach((button) => {
  button.classList.toggle("active", button.dataset.unit === state.unit);

  button.addEventListener("click", () => {
    state.unit = button.dataset.unit;
    localStorage.setItem(STORAGE_KEYS.unit, state.unit);
    unitButtons.forEach((item) => item.classList.toggle("active", item === button));

    if (state.latestWeather && state.latestPlace) {
      renderWeather(state.latestPlace, state.latestWeather);
      formFeedback.textContent = `Switched to ${state.unit === "metric" ? "Celsius" : "Fahrenheit"}.`;
    }
  });
});

initializeWeather();
