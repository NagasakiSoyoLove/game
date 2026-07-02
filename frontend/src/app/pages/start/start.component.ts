import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BgmService } from '../../services/bgm.service';

@Component({
  selector: 'app-start',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './start.component.html',
  styleUrl: './start.component.css'
})
export class StartComponent {
  private bgm = inject(BgmService);

  startGame(): void {
    this.safePlayAudio();
  }

  private safePlayAudio(): void {
    try {
      this.playStartSound();
      this.bgm.play();
    } catch {
      return;
    }
  }

  private playStartSound(): void {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const now = audio.currentTime;
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(220, now);
    oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.35);
    gain.gain.setValueAtTime(0.08 * this.bgm.sfxVolume(), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.35);
  }
}
