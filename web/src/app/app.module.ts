import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { AngularFireModule } from '@angular/fire';
import { AngularFireDatabaseModule } from '@angular/fire/database';
import { AngularFireStorageModule } from '@angular/fire/storage';
import { AngularFireAuthModule } from '@angular/fire/auth';

import { environment } from '../environments/environment';
import { HierarchyComponent } from './hierarchy/hierarchy.component';
import { TpsComponent } from './tps/tps.component';
import { PathComponent } from './path/path.component';
import { UploadComponent } from './upload/upload.component';
import { TpsPhotosComponent } from './tps-photos/tps-photos.component';
import { UploadSequenceComponent } from './upload-sequence/upload-sequence.component';

import {
  MatButtonModule,
  MatFormFieldModule,
  MatInputModule,
  MatProgressSpinnerModule
} from '@angular/material';
import { MatToolbarModule } from '@angular/material/toolbar';

import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [
    AppComponent,
    HierarchyComponent,
    TpsComponent,
    PathComponent,
    UploadComponent,
    TpsPhotosComponent,
    UploadSequenceComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,

    HttpClientModule,

    AngularFireModule.initializeApp(environment.firebase),
    AngularFireDatabaseModule,
    AngularFireAuthModule,
    AngularFireStorageModule,
    AppRoutingModule,

    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,

    MatToolbarModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
