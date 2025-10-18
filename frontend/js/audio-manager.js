/**
 * Audio Manager - Handles all audio functionality for the game
 */
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.musicEnabled = true;
        this.soundEnabled = true;
        this.ambientMusic = null;
        this.currentMusicVolume = 0.3;
        
        // Sound effect configurations
        this.sounds = {
            growth: { frequency: 440, duration: 0.2, type: 'sine' },
            cut: { frequency: 200, duration: 0.3, type: 'sawtooth' },
            leaves: { frequency: 660, duration: 0.25, type: 'triangle' },
            flower: { frequency: 523, duration: 0.3, type: 'sine' },
            fruit: { frequency: 392, duration: 0.4, type: 'square' },
            reposition: { frequency: 350, duration: 0.15, type: 'sine' },
            pan: { frequency: 300, duration: 0.1, type: 'triangle' },
            study: { frequency: 880, duration: 0.2, type: 'sine' },
            click: { frequency: 800, duration: 0.1, type: 'square' }
        };
        
        this.init();
    }
    
    init() {
        // Initialize audio context
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('Audio context initialized');
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
        }
        
        // Load user preferences from localStorage
        this.loadPreferences();
    }
    
    loadPreferences() {
        const musicPref = localStorage.getItem('perplexitree_music_enabled');
        const soundPref = localStorage.getItem('perplexitree_sound_enabled');
        
        // Disable music by default for now
        this.musicEnabled = false;
        if (soundPref !== null) {
            this.soundEnabled = soundPref === 'true';
        }
    }
    
    savePreferences() {
        localStorage.setItem('perplexitree_music_enabled', this.musicEnabled.toString());
        localStorage.setItem('perplexitree_sound_enabled', this.soundEnabled.toString());
    }
    
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        this.savePreferences();
        
        if (this.musicEnabled) {
            this.startAmbientMusic();
        } else {
            this.stopAmbientMusic();
        }
        
        this.updateMusicButton();
        console.log('Music', this.musicEnabled ? 'enabled' : 'disabled');
    }
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.savePreferences();
        this.updateSoundButton();
        console.log('Sound effects', this.soundEnabled ? 'enabled' : 'disabled');
    }
    
    startAmbientMusic() {
        if (!this.musicEnabled || !this.audioContext) return;
        
        // Ensure audio context is running
        if (this.audioContext.state === 'suspended') {
            console.log('Audio context suspended, cannot start music');
            return;
        }
        
        // Stop existing music
        this.stopAmbientMusic();
        
        // Create a simple ambient soundscape
        this.ambientMusic = this.createAmbientSoundscape();
        if (this.ambientMusic) {
            this.ambientMusic.start();
            console.log('Ambient music started');
            this.updateMusicButton(); // Update button to show pulsing animation
        }
    }
    
    stopAmbientMusic() {
        if (this.ambientMusic) {
            this.ambientMusic.stop();
            this.ambientMusic = null;
            this.updateMusicButton(); // Update button to remove pulsing animation
        }
    }
    
    createAmbientSoundscape() {
        if (!this.audioContext) return null;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();
        
        // Create a gentle, nature-like ambient tone
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(110, this.audioContext.currentTime); // Low A
        
        // Add subtle frequency modulation for movement
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.05, this.audioContext.currentTime); // Very slow modulation
        lfoGain.gain.setValueAtTime(3, this.audioContext.currentTime); // Subtle pitch variation
        
        // Filter for warmth
        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(600, this.audioContext.currentTime);
        filterNode.Q.setValueAtTime(1, this.audioContext.currentTime);
        
        // Volume control - fade in gradually
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.currentMusicVolume * 0.2, this.audioContext.currentTime + 3);
        
        // Connect the nodes
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);
        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Start the LFO
        lfo.start();
        
        return {
            oscillator: oscillator,
            gainNode: gainNode,
            lfo: lfo,
            start: () => {
                oscillator.start();
                // Restart the oscillator when it ends to create a loop
                oscillator.onended = () => {
                    if (this.musicEnabled && this.ambientMusic) {
                        const newMusic = this.createAmbientSoundscape();
                        if (newMusic) {
                            this.ambientMusic = newMusic;
                            this.ambientMusic.start();
                        }
                    }
                };
            },
            stop: () => {
                oscillator.onended = null;
                oscillator.stop();
                lfo.stop();
            }
        };
    }
    
    playSound(soundName) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const soundConfig = this.sounds[soundName];
        if (!soundConfig) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = soundConfig.type;
        oscillator.frequency.setValueAtTime(soundConfig.frequency, this.audioContext.currentTime);
        
        // Create envelope for natural sound
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + soundConfig.duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + soundConfig.duration);
    }
    
    playToolSound(toolName) {
        // Map tool names to sound names
        const soundMap = {
            'growth': 'growth',
            'cut': 'cut',
            'leaves': 'leaves',
            'flower': 'flower',
            'fruit': 'fruit',
            'reposition': 'reposition',
            'pan': 'pan',
            'study': 'study'
        };
        
        const soundName = soundMap[toolName];
        if (soundName) {
            this.playSound(soundName);
        }
    }
    
    playClickSound() {
        this.playSound('click');
    }
    
    updateMusicButton() {
        const musicBtn = document.getElementById('musicToggle');
        if (musicBtn) {
            const icon = musicBtn.querySelector('i');
            if (this.musicEnabled) {
                icon.className = 'fas fa-volume-up';
                musicBtn.title = 'Mute ambient music (currently disabled)';
                musicBtn.style.opacity = '1';
                // Add pulsing animation when music is enabled
                if (this.ambientMusic) {
                    musicBtn.classList.add('pulse');
                } else {
                    musicBtn.classList.remove('pulse');
                }
            } else {
                icon.className = 'fas fa-volume-mute';
                musicBtn.title = 'Enable ambient music (currently disabled)';
                musicBtn.style.opacity = '0.5';
                musicBtn.classList.remove('pulse');
            }
        }
    }
    
    updateSoundButton() {
        const soundBtn = document.getElementById('soundToggle');
        if (soundBtn) {
            const icon = soundBtn.querySelector('i');
            if (this.soundEnabled) {
                icon.className = 'fas fa-volume-up';
                soundBtn.title = 'Mute sound effects for tools and interactions';
                soundBtn.style.opacity = '1';
            } else {
                icon.className = 'fas fa-volume-mute';
                soundBtn.title = 'Enable sound effects for tools and interactions';
                soundBtn.style.opacity = '0.5';
            }
        }
    }
    
    // Handle user interaction to enable audio context (required by browsers)
    enableAudio() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log('Audio context resumed');
                // Start music if it's enabled
                if (this.musicEnabled) {
                    setTimeout(() => {
                        this.startAmbientMusic();
                    }, 100);
                }
            });
        }
    }
}
