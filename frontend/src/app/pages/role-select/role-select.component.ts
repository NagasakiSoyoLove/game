import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Role } from '../../models/role';
import { BgmService } from '../../services/bgm.service';

@Component({
  selector: 'app-role-select',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './role-select.component.html',
  styleUrl: './role-select.component.css'
})
export class RoleSelectComponent implements OnInit {
  private bgm = inject(BgmService);

  roles: Role[] = [];
  loading = true;
  error = '';

  ngOnInit(): void {
    this.bgm.play();
    this.roles = [
      {
        id: 'a',
        name: '天阳',
        hp: 95,
        speed: 90,
        stealth: 45,
        puzzle: 60,
        risk: 85,
        skill: '篮球突进',
        imageUrl: '/tianyang.png'
      },
      {
        id: 'b',
        name: '林萧',
        hp: 75,
        speed: 70,
        stealth: 70,
        puzzle: 75,
        risk: 50,
        skill: '冷静判断',
        imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=pixel%20art%20calm%20Chinese%20high%20school%20student%2C%20blue%20school%20uniform%2C%20thoughtful%20expression%2C%20retro%2016-bit%20game%20character%20portrait%2C%20clean%20dark%20background%2C%20high%20contrast%2C%20crisp%20pixels&image_size=square'
      },
      {
        id: 'c',
        name: '黄猫',
        hp: 65,
        speed: 55,
        stealth: 95,
        puzzle: 85,
        risk: 25,
        skill: '无声移动',
        imageUrl: '/huangmao.png'
      }
    ];
    this.loading = false;
  }

  choose(role: Role): void {
    this.playSelectSound();
    this.bgm.play();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('selectedRole', JSON.stringify(role));
    }
  }

  statWidth(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  private playSelectSound(): void {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(520, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, audio.currentTime + 0.12);
    gain.gain.setValueAtTime(0.08 * this.bgm.sfxVolume(), audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.18);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.18);
  }
}
