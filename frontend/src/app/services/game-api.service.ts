import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Role } from '../models/role';

export interface Teacher {
  name: string;
  route: [number, number][];
  speed: number;
}

export interface Level {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: string[];
  player: [number, number];
  key: [number, number];
  exit: [number, number];
  teachers: Teacher[];
}

@Injectable({ providedIn: 'root' })
export class GameApiService {
  private http = inject(HttpClient);
  private base = 'http://localhost:8080/api';

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.base}/roles`);
  }

  getLevel(id: string): Observable<Level> {
    return this.http.get<Level>(`${this.base}/levels/${id}`);
  }
}
