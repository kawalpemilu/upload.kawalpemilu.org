import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DigitizeComponent } from './digitize.component';

describe('DigitizeComponent', () => {
  let component: DigitizeComponent;
  let fixture: ComponentFixture<DigitizeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DigitizeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DigitizeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
