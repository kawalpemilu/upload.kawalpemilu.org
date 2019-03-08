import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgModule, LOCALE_ID } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { AngularFireModule } from '@angular/fire';
import { AngularFireStorageModule } from '@angular/fire/storage';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { AngularFirestoreModule } from '@angular/fire/firestore';

import { environment } from '../environments/environment';
import { HierarchyComponent } from './hierarchy/hierarchy.component';
import { TpsComponent } from './tps/tps.component';
import { PathComponent } from './path/path.component';
import { UploadSequenceComponent } from './upload-sequence/upload-sequence.component';

import {
  MatButtonModule,
  MatFormFieldModule,
  MatInputModule,
  MatProgressSpinnerModule,
  MatIconModule,
  MatSidenavModule,
  MatListModule,
  MatSnackBarModule
} from '@angular/material';
import { MatToolbarModule } from '@angular/material/toolbar';

import { HttpClientModule } from '@angular/common/http';
import { LoginComponent } from './login/login.component';
import {
  RegistrasiComponent,
  CopySnackBarComponent
} from './registrasi/registrasi.component';
import { ThumbnailComponent } from './thumbnail/thumbnail.component';
import { DigitizeComponent } from './digitize/digitize.component';
import { ApproverComponent } from './approver/approver.component';
import { FotoComponent } from './foto/foto.component';
import { HieLinkComponent } from './hie-link/hie-link.component';
import { LaporButtonComponent } from './lapor-button/lapor-button.component';
import { ChatComponent } from './chat/chat.component';
import { registerLocaleData } from '@angular/common';
import localeId from '@angular/common/locales/id';

@NgModule({
  entryComponents: [RegistrasiComponent, CopySnackBarComponent],
  declarations: [
    AppComponent,
    HierarchyComponent,
    TpsComponent,
    PathComponent,
    UploadSequenceComponent,
    LoginComponent,
    RegistrasiComponent,
    CopySnackBarComponent,
    ThumbnailComponent,
    DigitizeComponent,
    ApproverComponent,
    FotoComponent,
    HieLinkComponent,
    LaporButtonComponent,
    ChatComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,

    HttpClientModule,

    AngularFireModule.initializeApp(environment.firebase),
    AngularFireAuthModule,
    AngularFirestoreModule,
    AngularFireStorageModule,
    AppRoutingModule,

    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,

    MatToolbarModule
  ],
  providers: [{ provide: LOCALE_ID, useValue: 'id' }],
  bootstrap: [AppComponent]
})
export class AppModule {}

registerLocaleData(localeId, 'id');
