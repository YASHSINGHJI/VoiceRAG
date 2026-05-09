import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, CircleDot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import "./SearchBar.css";

const SUGGESTIONS = [
  "Neural Networks",
  "Backpropagation",
  "Deep Learning",
  "Transformers",
  "Heuristic Search",
  "Genetic Algorithms",
  "Support Vector Machines",
  "Reinforcement Learning",
  "Bayesian Reasoning",
  "Natural Language Processing",
  "Knowledge Representation",
  "Constraint Satisfaction"
];

const GooeyFilter = () => (
  <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden="true">
    <defs>
      <filter id="gooey-effect">
        <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
        <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -8" result="goo" />
        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
      </filter>
    </defs>
  </svg>
);

export const SearchBar = ({ placeholder = "Search lectures...", value, onChange }) => {
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value || "");
  const [isAnimating, setIsAnimating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isClicked, setIsClicked] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setSearchQuery(value || "");
  }, [value]);

  const isUnsupportedBrowser = useMemo(() => {
    if (typeof window === "undefined") return false;
    const ua = navigator.userAgent.toLowerCase();
    const isSafari = ua.includes("safari") && !ua.includes("chrome") && !ua.includes("chromium");
    const isChromeOniOS = ua.includes("crios");
    return isSafari || isChromeOniOS;
  }, []);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    onChange?.(val);

    if (val.trim()) {
      const filtered = SUGGESTIONS.filter((item) => 
        item.toLowerCase().includes(val.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
    }
  };

  const handleMouseMove = (e) => {
    if (isFocused) {
      const rect = e.currentTarget.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 800);
  };

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFocused]);

  const searchIconVariants = {
    initial: { scale: 1 },
    animate: {
      rotate: isAnimating ? [0, -15, 15, -10, 10, 0] : 0,
      scale: isAnimating ? [1, 1.3, 1] : 1,
      transition: { duration: 0.6, ease: "easeInOut" },
    },
  };

  const suggestionVariants = {
    hidden: (i) => ({
      opacity: 0,
      y: -10,
      scale: 0.95,
      transition: { duration: 0.15, delay: i * 0.05 },
    }),
    visible: (i) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 15, delay: i * 0.07 },
    }),
    exit: (i) => ({
      opacity: 0,
      y: -5,
      scale: 0.9,
      transition: { duration: 0.1, delay: i * 0.03 },
    }),
  };

  const particles = Array.from({ length: isFocused ? 18 : 0 }, (_, i) => (
    <motion.div
      key={i}
      initial={{ scale: 0 }}
      animate={{
        x: [0, (Math.random() - 0.5) * 40],
        y: [0, (Math.random() - 0.5) * 40],
        scale: [0, Math.random() * 0.8 + 0.4],
        opacity: [0, 0.8, 0],
      }}
      transition={{
        duration: Math.random() * 1.5 + 1.5,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "reverse",
      }}
      className="search-particle"
      style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        filter: "blur(2px)",
      }}
    />
  ));

  const clickParticles = isClicked
    ? Array.from({ length: 14 }, (_, i) => (
        <motion.div
          key={`click-${i}`}
          initial={{ x: mousePosition.x, y: mousePosition.y, scale: 0, opacity: 1 }}
          animate={{
            x: mousePosition.x + (Math.random() - 0.5) * 160,
            y: mousePosition.y + (Math.random() - 0.5) * 160,
            scale: Math.random() * 0.8 + 0.2,
            opacity: [1, 0],
          }}
          transition={{ duration: Math.random() * 0.8 + 0.5, ease: "easeOut" }}
          className="click-particle"
          style={{
            background: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 200) + 55}, ${Math.floor(Math.random() * 255)}, 0.8)`,
            boxShadow: "0 0 8px rgba(255, 255, 255, 0.8)",
          }}
        />
      ))
    : null;

  return (
    <div className="search-bar-wrapper">
      <GooeyFilter />
      <motion.form
        onSubmit={handleSubmit}
        className={`search-bar-container ${isFocused ? 'focused' : ''}`}
        initial={{ width: "300px" }}
        animate={{ width: isFocused ? "420px" : "300px", scale: isFocused ? 1.02 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        onMouseMove={handleMouseMove}
      >
        <motion.div
          className="search-bar-inner"
          animate={{
            boxShadow: isClicked
              ? "0 0 40px rgba(0, 255, 200, 0.4), 0 0 15px rgba(74, 144, 255, 0.4) inset"
              : isFocused
              ? "0 15px 35px rgba(0, 0, 0, 0.2)"
              : "0 0 0 rgba(0, 0, 0, 0)",
          }}
          onClick={handleClick}
        >
          {isFocused && (
            <motion.div
              className="search-bg-animate"
              initial={{ opacity: 0 }}
              animate={{
                opacity: 0.15,
                background: [
                  "linear-gradient(90deg, #00ffc8 0%, #4a90ff 100%)",
                  "linear-gradient(90deg, #4a90ff 0%, #00ffc8 100%)",
                  "linear-gradient(90deg, #00ffc8 0%, #4a90ff 100%)",
                ],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
          )}

          <div
            className="search-gooey-layer"
            style={{ filter: isUnsupportedBrowser ? "none" : "url(#gooey-effect)" }}
          >
            {particles}
          </div>

          {isClicked && (
            <>
              <motion.div
                className="click-ripple"
                initial={{ scale: 0, opacity: 0.7 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </>
          )}

          {clickParticles}

          <motion.div className="search-icon-box" variants={searchIconVariants} initial="initial" animate="animate">
            <Search
              size={20}
              strokeWidth={isFocused ? 2.5 : 2}
              className={`search-icon ${isAnimating ? 'animating' : ''}`}
            />
          </motion.div>

          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={handleSearch}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            className="search-input-el"
          />

          <AnimatePresence>
            {searchQuery && (
              <motion.button
                type="submit"
                initial={{ opacity: 0, scale: 0.8, x: -20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: -20 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="search-submit-btn"
              >
                Search
              </motion.button>
            )}
          </AnimatePresence>

          {isFocused && (
            <motion.div
              className="search-glow-top"
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 0.1, 0.2, 0.1, 0],
                background: "radial-gradient(circle at 50% 0%, rgba(0,255,200,0.4) 0%, transparent 70%)",
              }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "loop" }}
            />
          )}
        </motion.div>
      </motion.form>

      <AnimatePresence>
        {isFocused && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            transition={{ duration: 0.2 }}
            className="search-suggestions"
          >
            <div className="suggestions-list">
              {suggestions.map((suggestion, index) => (
                <motion.div
                  key={suggestion}
                  custom={index}
                  variants={suggestionVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  onClick={() => {
                    setSearchQuery(suggestion);
                    onChange?.(suggestion);
                    setIsFocused(false);
                  }}
                  className="suggestion-item"
                >
                  <CircleDot size={14} className="suggestion-dot" />
                  <span>{suggestion}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
