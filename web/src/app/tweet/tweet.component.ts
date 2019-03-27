import { Component, AfterViewInit, Input } from '@angular/core';

@Component({
  selector: 'app-tweet',
  template: `
    <a
      href="https://twitter.com/share"
      data-size="large"
      data-via="KawalPemilu2019"
      [attr.data-text]="text"
      [attr.data-url]="url"
      [attr.data-hashtags]="hashtags"
      class="twitter-share-button"
    ></a>
  `
})
export class TweetComponent implements AfterViewInit {
  @Input() url = location.href;
  @Input() text = '';
  @Input() hashtags = '';

  constructor() {
    // load twitter sdk if required
    const url = 'https://platform.twitter.com/widgets.js';
    if (!document.querySelector(`script[src='${url}']`)) {
      const script = document.createElement('script');
      script.src = url;
      document.body.appendChild(script);
    }
  }

  ngAfterViewInit(): void {
    // render tweet button
    if (window['twttr']) {
      window['twttr'].widgets.load();
    }
  }
}
