import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from 'firebase';
import { retry } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  static HOST = 'https://kawal-c1.firebaseapp.com';

  constructor(private http: HttpClient) {}

  async get(user: User, path: string) {
    return this.http
      .get(path, await this.getHeaders(user))
      .pipe(retry(3))
      .toPromise();
  }

  async post(user: User, path: string, body: any) {
    return this.http
      .post(path, body, await this.getHeaders(user))
      .pipe(retry(3))
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
