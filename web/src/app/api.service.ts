import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from 'firebase';
import { retry, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  static API_PREFIX = 'https://kawal-c1.firebaseapp.com/api';

  constructor(private http: HttpClient) {}

  async get(user: User, path: string) {
    const url = `${ApiService.API_PREFIX}/${path}`;
    return this.http
      .get(url, await this.getHeaders(user))
      .pipe(retry(3), take(1))
      .toPromise();
  }

  async post(user: User, path: string, body: any) {
    const url = `${ApiService.API_PREFIX}/${path}`;
    return this.http
      .post(url, body, await this.getHeaders(user))
      .pipe(retry(3), take(1))
      .toPromise();
  }

  private async getHeaders(user: User) {
    if (!user) {
      return {};
    }
    const idToken = await user.getIdToken();
    const headers = { Authorization: `Bearer ${idToken}` };
    return { headers };
  }
}
