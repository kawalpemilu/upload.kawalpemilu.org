import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistrasiComponent } from './registrasi.component';

describe('RegistrasiComponent', () => {
  let component: RegistrasiComponent;
  let fixture: ComponentFixture<RegistrasiComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RegistrasiComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RegistrasiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
