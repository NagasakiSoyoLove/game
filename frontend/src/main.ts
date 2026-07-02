import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { BgmService, VolumeSettings } from './app/services/bgm.service';
import { appConfig } from './app/app.config';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="global-volume">
      <button class="pixel-btn volume-toggle" (click)="toggleVolumePanel()">音量</button>
      <div class="pixel-panel volume-panel" *ngIf="volumeOpen">
        <label>总音量 {{ volumePercent('master') }}%</label>
        <input type="range" min="0" max="100" [value]="volumePercent('master')" (input)="changeVolume('master', $event)" />
        <label>BGM {{ volumePercent('bgm') }}%</label>
        <input type="range" min="0" max="100" [value]="volumePercent('bgm')" (input)="changeVolume('bgm', $event)" />
        <label>音效 {{ volumePercent('sfx') }}%</label>
        <input type="range" min="0" max="100" [value]="volumePercent('sfx')" (input)="changeVolume('sfx', $event)" />
        <label>语音/特殊 {{ volumePercent('voice') }}%</label>
        <input type="range" min="0" max="100" [value]="volumePercent('voice')" (input)="changeVolume('voice', $event)" />
      </div>
    </div>
    <router-outlet></router-outlet>
  `
})
class AppComponent {
  private bgm = inject(BgmService);
  volumeOpen = false;
  volumeSettings = this.bgm.getSettings();

  toggleVolumePanel(): void {
    this.volumeOpen = !this.volumeOpen;
  }

  changeVolume(part: keyof VolumeSettings, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.bgm.setVolumePart(part, Number(input.value) / 100);
    this.volumeSettings = this.bgm.getSettings();
  }

  volumePercent(part: keyof VolumeSettings): number {
    return Math.round(this.volumeSettings[part] * 100);
  }
}

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
