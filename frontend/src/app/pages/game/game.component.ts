import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Role } from '../../models/role';
import { BgmService } from '../../services/bgm.service';

type TileType = 'wall' | 'floor' | 'player' | 'key' | 'exit' | 'teacher' | 'npc' | 'chest';
type SoundType = 'move' | 'blocked' | 'key' | 'caught' | 'win' | 'select' | 'skill' | 'chest' | 'hit';

interface Teacher {
  name: string;
  route: [number, number][];
  currentRouteIndex: number;
  x: number;
  y: number;
  chase: boolean;
  stunned: number;
}

interface Npc {
  name: string;
  x: number;
  y: number;
  dialog: string;
}

interface Chest {
  x: number;
  y: number;
  name: string;
  loot: string;
  value: number;
  opened: boolean;
}

interface Level {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: string[];
  player: [number, number];
  key: [number, number];
  exit: [number, number];
  teachers: Teacher[];
  npcs: Npc[];
  chests: Chest[];
}

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game.component.html',
  styleUrl: './game.component.css'
})
export class GameComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private bgm = inject(BgmService);

  level?: Level;
  selectedRole?: Role;
  player = { x: 1, y: 1 };
  lastMove: [number, number] = [1, 0];
  hasKey = false;
  message = '搜文具、躲老师、拿钥匙，从校门撤离。';
  dialogTitle = '任务开始';
  dialogText = '今晚教学楼封锁前，你要搜到有用文具，拿到备用钥匙，然后从出口撤离。按 E 搜索/对话，按 F 反制身边老师。';
  loading = true;
  error = '';

  inventory: { name: string; value: number }[] = [];
  skillCooldown = 0;
  silentSteps = 0;
  revealHint = '';
  escaped = false;
  revealHintTimer?: ReturnType<typeof setTimeout>;
  cooldownTimer?: ReturnType<typeof setInterval>;
  teacherTimer?: ReturnType<typeof setInterval>;
  private heldMoveKeys = new Set<string>();

  ngOnInit(): void {
    this.bgm.stop();

    if (typeof localStorage !== 'undefined') {
      const savedRole = localStorage.getItem('selectedRole');
      if (savedRole) {
        this.selectedRole = JSON.parse(savedRole) as Role;
      }
    }

    this.level = {
      id: 'level-1',
      name: '云梦一中教学楼搜撤',
      width: 20,
      height: 14,
      tiles: [
        '####################',
        '#S....#.....N......#',
        '#.##..#.####.####..#',
        '#..C..#....#....#..#',
        '#.###.####.#.##.#..#',
        '#.....C....#..#....#',
        '###.######.##.####.#',
        '#...#....#....C....#',
        '#.#.#.##.####.####.#',
        '#.#...#....K....#..#',
        '#.###.#.######..#..#',
        '#..N..#....C....#E.#',
        '#......T.......T...#',
        '####################'
      ],
      player: [1, 1],
      key: [12, 9],
      exit: [17, 11],
      teachers: [
        { name: '黄主任', route: [[7, 12], [8, 12], [9, 12], [10, 12], [11, 12], [12, 12]], currentRouteIndex: 0, x: 7, y: 12, chase: false, stunned: 0 },
        { name: '韩老师', route: [[15, 12], [16, 12], [17, 12], [18, 12], [17, 12], [16, 12]], currentRouteIndex: 0, x: 15, y: 12, chase: false, stunned: 0 },
        { name: '值周老师', route: [[9, 5], [10, 5], [11, 5], [10, 5]], currentRouteIndex: 0, x: 9, y: 5, chase: false, stunned: 0 }
      ],
      npcs: [
        { name: '热心同学', x: 12, y: 1, dialog: '宝箱里可能有尺子、圆规、订书机。拿得越多，撤离评价越高。' },
        { name: '门卫大叔', x: 3, y: 11, dialog: '出口要钥匙。被追上时，身边有老师就按 F 反制，能争取几秒。' }
      ],
      chests: [
        { x: 3, y: 3, name: '讲台抽屉', loot: '红笔', value: 10, opened: false },
        { x: 6, y: 5, name: '失物柜', loot: '三角尺', value: 18, opened: false },
        { x: 13, y: 7, name: '美术箱', loot: '圆规', value: 25, opened: false },
        { x: 11, y: 11, name: '办公室箱子', loot: '订书机', value: 35, opened: false }
      ]
    };

    this.player = { x: this.level.player[0], y: this.level.player[1] };
    this.loading = false;
    this.startCooldownTimer();
    this.startTeacherTimer();
  }

  ngOnDestroy(): void {
    clearInterval(this.cooldownTimer);
    clearInterval(this.teacherTimer);
    clearTimeout(this.revealHintTimer);
  }

  @HostListener('window:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (!this.level || this.loading || this.escaped) {
      return;
    }

    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();
      this.useSkill();
      return;
    }

    if (event.key === 'e' || event.key === 'E') {
      this.interact();
      return;
    }

    if (event.key === 'f' || event.key === 'F') {
      this.fightTeacher();
      return;
    }

    const delta = this.moveDeltaForKey(event.key);
    if (!delta) {
      return;
    }

    this.heldMoveKeys.add(event.key);

    const nextX = this.player.x + delta[0];
    const nextY = this.player.y + delta[1];
    if (this.isWall(nextX, nextY)) {
      this.playSound('blocked');
      return;
    }

    this.player = { x: nextX, y: nextY };
    this.lastMove = delta;
    this.playSound('move');
    if (this.silentSteps > 0) {
      this.silentSteps -= 1;
    }

    this.checkKey();
    this.checkDirectCatch();
    this.checkExit();
    this.checkNearbyHint();
    this.updateTeacherAwareness();
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent): void {
    this.heldMoveKeys.delete(event.key);
  }

  startCooldownTimer(): void {
    this.cooldownTimer = setInterval(() => {
      if (this.skillCooldown > 0) {
        this.skillCooldown -= 1;
      }
      if (this.level) {
        for (const teacher of this.level.teachers) {
          if (teacher.stunned > 0) {
            teacher.stunned -= 1;
          }
        }
      }
    }, 1000);
  }

  startTeacherTimer(): void {
    this.teacherTimer = setInterval(() => {
      if (!this.level || this.escaped) {
        return;
      }

      for (const teacher of this.level.teachers) {
        if (teacher.stunned > 0) {
          continue;
        }
        if (teacher.chase) {
          this.moveTeacherTowardPlayer(teacher);
        } else {
          this.moveTeacherOnRoute(teacher);
        }
      }

      this.updateTeacherAwareness();
      this.checkDirectCatch();
    }, 750);
  }

  moveTeacherOnRoute(teacher: Teacher): void {
    const target = teacher.route[teacher.currentRouteIndex];
    teacher.x = target[0];
    teacher.y = target[1];
    teacher.currentRouteIndex = (teacher.currentRouteIndex + 1) % teacher.route.length;
  }

  moveTeacherTowardPlayer(teacher: Teacher): void {
    const dx = this.player.x - teacher.x;
    const dy = this.player.y - teacher.y;
    const stepX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
    const stepY = dy === 0 ? 0 : dy > 0 ? 1 : -1;
    const tryHorizontal = Math.abs(dx) >= Math.abs(dy);

    if (tryHorizontal) {
      if (!this.isBlockedForTeacher(teacher.x + stepX, teacher.y)) {
        teacher.x += stepX;
      } else if (!this.isBlockedForTeacher(teacher.x, teacher.y + stepY)) {
        teacher.y += stepY;
      }
    } else if (!this.isBlockedForTeacher(teacher.x, teacher.y + stepY)) {
      teacher.y += stepY;
    } else if (!this.isBlockedForTeacher(teacher.x + stepX, teacher.y)) {
      teacher.x += stepX;
    }
  }

  updateTeacherAwareness(): void {
    if (!this.level) {
      return;
    }

    for (const teacher of this.level.teachers) {
      if (teacher.stunned > 0 || (this.selectedRole?.name === '黄猫' && this.silentSteps > 0)) {
        teacher.chase = false;
        continue;
      }

      const distance = Math.abs(teacher.x - this.player.x) + Math.abs(teacher.y - this.player.y);
      const hasSight = (teacher.y === this.player.y || teacher.x === this.player.x) && this.hasLineOfSight(teacher.x, teacher.y, this.player.x, this.player.y);

      if (distance <= 2 || hasSight) {
        teacher.chase = true;
        this.showDialog('危险', `${teacher.name} 发现你了，快跑！`);
      } else if (distance > 6) {
        teacher.chase = false;
      }
    }
  }

  useSkill(): void {
    if (!this.selectedRole) {
      this.showDialog('无法使用技能', '请先返回大厅选择角色。');
      return;
    }

    if (this.skillCooldown > 0) {
      this.showDialog('技能冷却', `还需要等待 ${this.skillCooldown} 秒。`);
      this.playSound('blocked');
      return;
    }

    if (this.selectedRole.name === '天阳') {
      this.playManSound();
      const hitTeacher = this.tryDash(4, this.dashDelta());
      this.skillCooldown = 8;
      this.showDialog('篮球突进', hitTeacher ? '天阳多方向冲刺，并肘击放倒了老师。' : '天阳朝指定方向快速冲刺。');
      return;
    }

    this.playSound('skill');
    if (this.selectedRole.name === '林萧') {
      const unopened = this.level?.chests.filter((chest) => !chest.opened).map((chest) => chest.name).join('、') || '无';
      this.revealHint = `钥匙在 (${this.level?.key[0]}, ${this.level?.key[1]})，出口在 (${this.level?.exit[0]}, ${this.level?.exit[1]})，未搜索：${unopened}`;
      clearTimeout(this.revealHintTimer);
      this.revealHintTimer = setTimeout(() => this.revealHint = '', 5000);
      this.skillCooldown = 6;
      this.showDialog('冷静判断', this.revealHint);
      return;
    }

    if (this.selectedRole.name === '黄猫') {
      this.silentSteps = 8;
      this.skillCooldown = 10;
      this.showDialog('无声移动', '黄猫进入潜行状态，接下来几步不容易被发现。');
    }
  }

  tryDash(distance: number, delta: [number, number]): boolean {
    let hitTeacher = false;

    for (let step = 0; step < distance; step++) {
      const nextX = this.player.x + delta[0];
      const nextY = this.player.y + delta[1];
      if (this.isWall(nextX, nextY)) {
        break;
      }

      const teacher = this.level?.teachers.find((item) => item.x === nextX && item.y === nextY);
      if (teacher) {
        this.elbowTeacher(teacher, 8);
        hitTeacher = true;
        this.playSound('hit');
      }

      this.player = { x: nextX, y: nextY };
      this.lastMove = delta;
    }

    this.checkKey();
    this.checkDirectCatch();
    this.checkExit();
    this.checkNearbyHint();
    this.updateTeacherAwareness();
    return hitTeacher;
  }

  interact(): void {
    const chest = this.nearbyChest();
    if (chest) {
      this.openChest(chest);
      return;
    }

    const npc = this.level?.npcs.find((item) => Math.abs(item.x - this.player.x) + Math.abs(item.y - this.player.y) === 1);
    if (npc) {
      this.showDialog(npc.name, npc.dialog);
      this.playSound('select');
      return;
    }

    this.showDialog('没有目标', '附近没有可搜索的宝箱或可对话的人。');
    this.playSound('blocked');
  }

  openChest(chest: Chest): void {
    if (chest.opened) {
      this.showDialog(chest.name, '这里已经被搜过了。');
      return;
    }

    chest.opened = true;
    this.inventory.push({ name: chest.loot, value: chest.value });
    this.showDialog('搜索成功', `你打开了${chest.name}，获得 ${chest.loot}，价值 ${chest.value} 分。`);
    this.playSound('chest');
  }

  fightTeacher(): void {
    const teacher = this.level?.teachers.find((item) => Math.abs(item.x - this.player.x) + Math.abs(item.y - this.player.y) === 1);
    if (!teacher) {
      this.showDialog('反制失败', '身边没有老师，无法反制。');
      this.playSound('blocked');
      return;
    }

    const stunSeconds = this.selectedRole?.name === '天阳' ? 7 : 4;
    this.elbowTeacher(teacher, stunSeconds);
    this.showDialog('反制成功', this.selectedRole?.name === '天阳' ? `天阳肘开了${teacher.name}，他暂时动不了了。` : `你用书包挡住了${teacher.name}，他暂时停下了。快撤！`);
    this.playSound('hit');
  }

  checkNearbyHint(): void {
    if (this.nearbyChest()) {
      this.message = '附近有宝箱，按 E 搜索。';
      return;
    }

    const hasNpcNearby = this.level?.npcs.some((item) => Math.abs(item.x - this.player.x) + Math.abs(item.y - this.player.y) === 1);
    if (hasNpcNearby) {
      this.message = '附近有人，按 E 对话。';
    }
  }

  checkKey(): void {
    if (!this.level) {
      return;
    }
    if (!this.hasKey && this.player.x === this.level.key[0] && this.player.y === this.level.key[1]) {
      this.hasKey = true;
      this.showDialog('获得钥匙', '你拿到了备用钥匙，现在可以去出口撤离。');
      this.playSound('key');
    }
  }

  checkDirectCatch(): void {
    if (!this.level) {
      return;
    }

    for (const teacher of this.level.teachers) {
      if (teacher.stunned <= 0 && teacher.x === this.player.x && teacher.y === this.player.y) {
        this.player = { x: this.level.player[0], y: this.level.player[1] };
        this.lastMove = [1, 0];
        this.hasKey = false;
        this.inventory = [];
        for (const resetTeacher of this.level.teachers) {
          resetTeacher.chase = false;
          resetTeacher.stunned = 0;
          resetTeacher.currentRouteIndex = 0;
          resetTeacher.x = resetTeacher.route[0][0];
          resetTeacher.y = resetTeacher.route[0][1];
        }
        for (const chest of this.level.chests) {
          chest.opened = false;
        }
        this.showDialog('被抓到了', `被${teacher.name}抓到，文具被没收，已返回起点。`);
        if (this.selectedRole?.name === '天阳') {
          this.playTianyangDeathBgm();
        } else {
          this.playSound('caught');
        }
        return;
      }
    }
  }

  checkExit(): void {
    if (!this.level || this.escaped) {
      return;
    }
    if (this.player.x === this.level.exit[0] && this.player.y === this.level.exit[1]) {
      if (!this.hasKey) {
        this.showDialog('出口锁着', '还没有钥匙，不能撤离。先去找钥匙。');
        return;
      }

      this.escaped = true;
      const score = this.lootValue();
      this.showDialog('撤离成功', `你成功逃离教学楼！带出 ${this.inventory.length} 件文具，总价值 ${score} 分。`);
      this.playSound('win');
    }
  }

  restart(): void {
    if (!this.level) {
      return;
    }
    this.playSound('select');
    this.player = { x: this.level.player[0], y: this.level.player[1] };
    this.lastMove = [1, 0];
    this.hasKey = false;
    this.inventory = [];
    this.skillCooldown = 0;
    this.silentSteps = 0;
    this.revealHint = '';
    this.escaped = false;
    for (const teacher of this.level.teachers) {
      teacher.chase = false;
      teacher.stunned = 0;
      teacher.currentRouteIndex = 0;
      teacher.x = teacher.route[0][0];
      teacher.y = teacher.route[0][1];
    }
    for (const chest of this.level.chests) {
      chest.opened = false;
    }
    this.showDialog('重新开始', '重新开始搜撤，先搜宝箱，再拿钥匙撤离。');
  }

  backToLobby(): void {
    this.playSound('select');
    this.router.navigate(['/']);
  }

  tileType(x: number, y: number): TileType {
    if (!this.level) {
      return 'floor';
    }
    if (this.player.x === x && this.player.y === y) {
      return 'player';
    }
    if (this.level.npcs.some((npc) => npc.x === x && npc.y === y)) {
      return 'npc';
    }
    if (this.level.teachers.some((teacher) => teacher.x === x && teacher.y === y)) {
      return 'teacher';
    }
    if (this.level.chests.some((chest) => !chest.opened && chest.x === x && chest.y === y)) {
      return 'chest';
    }
    if (!this.hasKey && this.level.key[0] === x && this.level.key[1] === y) {
      return 'key';
    }
    if (this.level.exit[0] === x && this.level.exit[1] === y) {
      return 'exit';
    }
    return this.level.tiles[y][x] === '#' ? 'wall' : 'floor';
  }

  cells(): { x: number; y: number }[] {
    if (!this.level) {
      return [];
    }
    const result: { x: number; y: number }[] = [];
    for (let y = 0; y < this.level.height; y++) {
      for (let x = 0; x < this.level.width; x++) {
        result.push({ x, y });
      }
    }
    return result;
  }

  gridColumns(): string {
    return `repeat(${this.level?.width || 20}, 28px)`;
  }

  lootValue(): number {
    return this.inventory.reduce((sum, item) => sum + item.value, 0);
  }

  objectiveText(): string {
    if (this.escaped) {
      return '已撤离，任务完成';
    }
    if (this.hasKey) {
      return '钥匙已获得，前往出口撤离';
    }
    if (this.inventory.length > 0) {
      return '继续搜索文具，或前往钥匙位置';
    }
    return '搜宝箱 → 拿钥匙 → 撤离';
  }

  skillName(): string {
    if (!this.selectedRole) {
      return '未选择';
    }
    if (this.selectedRole.name === '天阳') {
      return '篮球突进';
    }
    if (this.selectedRole.name === '林萧') {
      return '冷静判断';
    }
    if (this.selectedRole.name === '黄猫') {
      return '无声移动';
    }
    return '未知技能';
  }

  private nearbyChest(): Chest | undefined {
    return this.level?.chests.find((item) => !item.opened && Math.abs(item.x - this.player.x) + Math.abs(item.y - this.player.y) === 1);
  }

  private moveDeltaForKey(key: string): [number, number] | undefined {
    const moveMap: Record<string, [number, number]> = {
      ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0]
    };
    return moveMap[key];
  }

  private dashDelta(): [number, number] {
    let x = 0;
    let y = 0;
    for (const key of this.heldMoveKeys) {
      const delta = this.moveDeltaForKey(key);
      if (!delta) {
        continue;
      }
      x += delta[0];
      y += delta[1];
    }

    x = Math.max(-1, Math.min(1, x));
    y = Math.max(-1, Math.min(1, y));
    return x === 0 && y === 0 ? this.lastMove : [x, y];
  }

  private elbowTeacher(teacher: Teacher, stunSeconds: number): void {
    teacher.stunned = stunSeconds;
    teacher.chase = false;
  }

  private showDialog(title: string, text: string): void {
    this.dialogTitle = title;
    this.dialogText = text;
    this.message = text;
  }

  private hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    if (!this.level) {
      return false;
    }

    if (x1 === x2) {
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      for (let y = minY + 1; y < maxY; y++) {
        if (this.level.tiles[y][x1] === '#') {
          return false;
        }
      }
      return true;
    }

    if (y1 === y2) {
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      for (let x = minX + 1; x < maxX; x++) {
        if (this.level.tiles[y1][x] === '#') {
          return false;
        }
      }
      return true;
    }

    return false;
  }

  private isWall(x: number, y: number): boolean {
    if (!this.level) {
      return true;
    }
    if (y < 0 || y >= this.level.height || x < 0 || x >= this.level.width) {
      return true;
    }
    return this.level.tiles[y][x] === '#';
  }

  private isBlockedForTeacher(x: number, y: number): boolean {
    return this.isWall(x, y);
  }

  private playManSound(): void {
    const audio = new Audio('/man.mp3');
    audio.volume = this.bgm.voiceVolume();
    audio.play().catch(() => undefined);
  }

  private playTianyangDeathBgm(): void {
    const audio = new Audio('/See you again meme.mp3');
    audio.volume = this.bgm.voiceVolume();
    audio.play().catch(() => undefined);
  }

  private playSound(type: SoundType): void {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const now = audio.currentTime;
    const config = {
      move: { start: 260, end: 320, duration: 0.06, volume: 0.025, type: 'square' as OscillatorType },
      blocked: { start: 120, end: 80, duration: 0.08, volume: 0.04, type: 'sawtooth' as OscillatorType },
      key: { start: 640, end: 980, duration: 0.18, volume: 0.08, type: 'triangle' as OscillatorType },
      caught: { start: 220, end: 70, duration: 0.25, volume: 0.08, type: 'sawtooth' as OscillatorType },
      win: { start: 520, end: 1040, duration: 0.35, volume: 0.08, type: 'triangle' as OscillatorType },
      select: { start: 420, end: 760, duration: 0.12, volume: 0.06, type: 'square' as OscillatorType },
      skill: { start: 360, end: 1180, duration: 0.22, volume: 0.09, type: 'triangle' as OscillatorType },
      chest: { start: 480, end: 920, duration: 0.2, volume: 0.08, type: 'square' as OscillatorType },
      hit: { start: 180, end: 420, duration: 0.16, volume: 0.09, type: 'sawtooth' as OscillatorType }
    }[type];
    const volume = config.volume * this.bgm.sfxVolume();

    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(config.start, now);
    oscillator.frequency.exponentialRampToValueAtTime(config.end, now + config.duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + config.duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + config.duration);
  }
}
