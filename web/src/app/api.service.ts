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

  // TODO: get user_link for app scoped url:
  // curl -i -X GET "https://graph.facebook.com/v3.2/101540840984083?fields=link&access_token=EA..."

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
