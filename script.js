'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, PHLevel, CName) {
    // this.date = ...
    // this.id = ...
    this.coords = coords; // [lat, lng]
    this.PHLevel = PHLevel; // in km
    this.CName = CName; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Pass extends Workout {
  type = 'pass';

  constructor(coords, PHLevel, CName, Result) {
    super(coords, PHLevel, CName);
    this.Result = Result;

    this._setDescription();
  }
}

class Fail extends Workout {
  type = 'fail';

  constructor(coords, PHLevel, CName, Redo) {
    super(coords, PHLevel, CName);
    this.Redo = Redo;
    // this.type = 'fail';
    this._setDescription();
  }
}

// const run1 = new pass([39, -12], 5.2, 24, 178);
// const cycling1 = new fail([39, -12], 27, 95, 523);
// console.log(pass1, fail1);

///////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputPHLevel = document.querySelector('.form__input--PHLevel');
const inputCName = document.querySelector('.form__input--CName');
const inputResult = document.querySelector('.form__input--Result');
const inputRedo = document.querySelector('.form__input--Redo');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleRedoField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.pt/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputPHLevel.focus();
  }

  _hideForm() {
    // Empty inputs
    inputPHLevel.value =
      inputCName.value =
      inputResult.value =
      inputRedo.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleRedoField() {
    inputRedo.closest('.form__row').classList.toggle('form__row--hidden');
    inputResult.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const PHLevel = +inputPHLevel.value;
    const CName = inputCName.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, create running object
    if (type === 'pass') {
      const Result = inputResult.value;

      // Check if data is valid
      if (
        // !Number.isFinite(PHLevel) ||
        // !Number.isFinite(CName) ||
        // !Number.isFinite(Result)
        !validInputs(PHLevel) ||
        !allPositive(PHLevel)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Pass([lat, lng], PHLevel, CName, Result);
      console.log(workout);
    }

    // If workout cycling, create cycling object
    if (type === 'fail') {
      const Redo = inputRedo.value;

      if (!validInputs(PHLevel) || !allPositive(PHLevel))
        return alert('Inputs have to be positive numbers!');

      workout = new Fail([lat, lng], PHLevel, CName, Redo);
      console.log(workout);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'pass' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'pass' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.type}</span>
          <span class="workout__unit"></span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.CName}</span>
          <span class="workout__unit"></span>
        </div>
    `;

    if (workout.type === 'pass')
      html += `
        <div class="workout__details">
         <span class="workout__icon">⚡️</span>
           <span class="workout__value">${workout.PHLevel}</span>
          <span class="workout__unit"></span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.Result}</span>
          <span class="workout__unit"></span>
        </div>
      </li>
      `;

    if (workout.type === 'fail')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.type}</span>
          <span class="workout__unit"></span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.Redo}</span>
          <span class="workout__unit"></span>
        </div>
      </li>
      `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    // BUGFIX: When we click on a workout before the map has loaded, we get an error. But there is an easy fix:
    if (!this.#map) return;

    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        CName: 1,
      },
    });

    // using the public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
