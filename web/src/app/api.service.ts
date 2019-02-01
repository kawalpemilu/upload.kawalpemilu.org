import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from 'firebase';
import { retry, shareReplay, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  static HOST = 'https://kawal-c1.firebaseapp.com';

  constructor(private http: HttpClient) {}

  getStatic<T>(url: string) {
    return (this.http.get(url).pipe(
      retry(3),
      take(1)
    ) as Observable<T>).toPromise();
  }

  async get(user: User, path: string) {
    return this.http
      .get(path, await this.getHeaders(user))
      .pipe(retry(3), take(1))
      .toPromise();
  }

  async post(user: User, path: string, body: any) {
    return this.http
      .post(path, body, await this.getHeaders(user))
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
