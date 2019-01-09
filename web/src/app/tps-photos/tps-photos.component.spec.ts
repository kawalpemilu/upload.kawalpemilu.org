import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TpsPhotosComponent } from './tps-photos.component';

describe('TpsPhotosComponent', () => {
  let component: TpsPhotosComponent;
  let fixture: ComponentFixture<TpsPhotosComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TpsPhotosComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TpsPhotosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
