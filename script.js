document.addEventListener("DOMContentLoaded", () => {
  // Selectors
  const select = (e) => document.querySelector(e);
  const selectAll = (e) => document.querySelectorAll(e);

  // Get CSS variables
  const style = getComputedStyle(document.body);
  const stage = select(".stage");
  const txt = select(".txt");
  const body = document.body;

  // Text parameters
  const weightInit = parseInt(style.getPropertyValue("--fw")); // 600 in example
  const weightTarget = 400; // 100-800
  const weightDiff = weightInit - weightTarget;

  const stretchInit = parseInt(style.getPropertyValue("--fs")); // 150 in example
  const stretchTarget = 80; // 10-200
  const stretchDiff = stretchInit - stretchTarget;

  const maxYScale = 2.5;

  // Split text into characters
  function splitText() {
    const text = txt.textContent;
    txt.textContent = "";

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = char === " " ? "\u00A0" : char;
      txt.appendChild(span);
    }
  }

  splitText();

  let chars = selectAll(".char");
  let numChars = chars.length;
  let isMouseDown = false;
  let mouseInitialY = 0;
  let mouseFinalY = 0;
  let distY = 0;
  let charIndexSelected = 0;
  let charH = txt.offsetHeight;
  let elasticDropOff = 0.8;
  let dragYScale = 0;

  // Animation functions
  function animInTxt() {
    stage.style.opacity = "1";

    chars.forEach((char, index) => {
      const delay = 0.5 + index * 0.05;
      const y = -(charH + 500);

      // Initial state
      char.style.fontWeight = weightTarget;
      char.style.fontStretch = `${stretchTarget}%`;
      char.style.transform = `translateY(${y}px) scaleY(2)`;

      // Animate in
      setTimeout(() => {
        animateChar(char, {
          y: 0,
          fontWeight: weightInit,
          fontStretch: stretchInit,
          scaleY: 1,
          duration: 1500,
          easing: "elastic",
        });
      }, delay * 1000);
    });

    setTimeout(initEvents, 0.5 + numChars * 0.05 * 1000);
  }

  function animateChar(element, options) {
    const startTime = performance.now();
    const initialY = parseFloat(
      element.style.transform?.match(/translateY\(([^)]+)px\)/)?.[1] || 0,
    );
    const initialScaleY = parseFloat(
      element.style.transform?.match(/scaleY\(([^)]+)\)/)?.[1] || 1,
    );
    const initialFontWeight =
      parseInt(element.style.fontWeight) || weightTarget;
    const initialFontStretch =
      parseInt(element.style.fontStretch) || stretchTarget;

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / options.duration, 1);

      // Elastic easing function
      let easedProgress = progress;
      if (options.easing === "elastic") {
        const p = 0.3;
        easedProgress =
          Math.pow(2, -10 * progress) *
            Math.sin(((progress - p / 4) * (2 * Math.PI)) / p) +
          1;
      } else {
        // Default ease-out
        easedProgress = 1 - Math.pow(1 - progress, 3);
      }

      // Apply transformations
      const y = initialY + (options.y - initialY) * easedProgress;
      const scaleY =
        initialScaleY + (options.scaleY - initialScaleY) * easedProgress;
      const fontWeight =
        initialFontWeight +
        (options.fontWeight - initialFontWeight) * easedProgress;
      const fontStretch =
        initialFontStretch +
        (options.fontStretch - initialFontStretch) * easedProgress;

      element.style.transform = `translateY(${y}px) scaleY(${scaleY})`;
      element.style.fontWeight = Math.round(fontWeight);
      element.style.fontStretch = `${Math.round(fontStretch)}%`;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  function initEvents() {
    body.addEventListener("mouseup", function (e) {
      if (isMouseDown) {
        mouseFinalY = e.clientY;
        isMouseDown = false;
        snapBackText();
        body.classList.remove("grab");
      }
    });

    body.addEventListener("mousemove", function (e) {
      if (isMouseDown) {
        mouseFinalY = e.clientY;
        calcDist();
        setFontDragDimensions();
      }
    });

    body.addEventListener("mouseleave", (event) => {
      if (
        event.clientY <= 0 ||
        event.clientX <= 0 ||
        event.clientX >= window.innerWidth ||
        event.clientY >= window.innerHeight
      ) {
        snapBackText();
        isMouseDown = false;
      }
    });

    chars.forEach((char, index) => {
      char.addEventListener("mousedown", function (e) {
        mouseInitialY = e.clientY;
        charIndexSelected = index;
        isMouseDown = true;
        body.classList.add("grab");
      });
    });
  }

  function calcDist() {
    let maxYDragDist = charH * (maxYScale - 1);
    distY = mouseInitialY - mouseFinalY;
    dragYScale = distY / maxYDragDist;

    if (dragYScale > maxYScale - 1) {
      dragYScale = maxYScale - 1;
    } else if (dragYScale < -0.5) {
      dragYScale = -0.5;
    }
  }

  function setFontDragDimensions() {
    chars.forEach((char, index) => {
      const fracDispersion = calcfracDispersion(index);

      const y = fracDispersion * -50;
      const fontWeight = weightInit - fracDispersion * weightDiff;
      const fontStretch = stretchInit - fracDispersion * stretchDiff;
      let scaleY = 1 + fracDispersion;
      if (scaleY < 0.5) scaleY = 0.5;

      char.style.transform = `translateY(${y}px) scaleY(${scaleY})`;
      char.style.fontWeight = Math.round(fontWeight);
      char.style.fontStretch = `${Math.round(fontStretch)}%`;
    });
  }

  function calcfracDispersion(index) {
    let dispersion =
      1 - Math.abs(index - charIndexSelected) / (numChars * elasticDropOff);
    return dispersion * dragYScale;
  }

  function snapBackText() {
    const startTime = performance.now();
    const duration = 1000;
    const stagger = 20;

    // Save initial values for each character
    const initialValues = Array.from(chars).map((char) => ({
      y: parseFloat(
        char.style.transform?.match(/translateY\(([^)]+)px\)/)?.[1] || 0,
      ),
      fontWeight: parseInt(char.style.fontWeight) || weightInit,
      fontStretch: parseInt(char.style.fontStretch) || stretchInit,
      scaleY: parseFloat(
        char.style.transform?.match(/scaleY\(([^)]+)\)/)?.[1] || 1,
      ),
    }));

    function step(currentTime) {
      const elapsed = currentTime - startTime;

      chars.forEach((char, index) => {
        const delay = Math.abs(index - charIndexSelected) * stagger;
        const progress = Math.min(
          Math.max((elapsed - delay) / (duration - delay), 0),
          1,
        );

        if (progress <= 0) return;

        // Elastic easing function
        const p = 0.35;
        const easedProgress =
          Math.pow(2, -10 * progress) *
            Math.sin(((progress - p / 4) * (2 * Math.PI)) / p) +
          1;

        const initial = initialValues[index];
        const y = initial.y * (1 - easedProgress);
        const fontWeight =
          weightInit + (initial.fontWeight - weightInit) * (1 - easedProgress);
        const fontStretch =
          stretchInit +
          (initial.fontStretch - stretchInit) * (1 - easedProgress);
        const scaleY = 1 + (initial.scaleY - 1) * (1 - easedProgress);

        char.style.transform = `translateY(${y}px) scaleY(${scaleY})`;
        char.style.fontWeight = Math.round(fontWeight);
        char.style.fontStretch = `${Math.round(fontStretch)}%`;
      });

      if (elapsed < duration + numChars * stagger) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  function resize() {
    charH = txt.offsetHeight;
  }

  // Initialize
  animInTxt();

  window.addEventListener("resize", () => {
    resize();
  });
});
