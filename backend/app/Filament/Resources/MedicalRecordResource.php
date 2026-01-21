<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Filament\Resources\MedicalRecordResource\Pages;
use App\Models\MedicalRecord;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Actions\BulkActionGroup;
use Filament\Tables\Actions\DeleteAction;
use Filament\Tables\Actions\DeleteBulkAction;
use Filament\Tables\Actions\EditAction;
use Filament\Tables\Actions\ViewAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class MedicalRecordResource extends Resource
{
    protected static ?string $model = MedicalRecord::class;

    protected static ?string $navigationIcon = 'heroicon-o-document-text';

    protected static ?string $navigationGroup = 'Pet Management';

    protected static ?int $navigationSort = 3;

    protected static ?string $navigationLabel = 'Medical Records';

    protected static ?string $modelLabel = 'Medical Record';

    protected static ?string $pluralModelLabel = 'Medical Records';

    protected static ?string $recordTitleAttribute = 'pet_id';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Record Information')
                    ->schema([
                        Forms\Components\Select::make('pet_id')
                            ->label('Pet')
                            ->relationship('pet', 'name')
                            ->searchable()
                            ->preload()
                            ->required(),

                        Forms\Components\Select::make('record_type')
                            ->label('Record Type')
                            ->options([
                                'vaccination' => 'Vaccination',
                                'medical_note' => 'Medical Note',
                                'surgery' => 'Surgery',
                                'prescription' => 'Prescription',
                                'diagnosis' => 'Diagnosis',
                                'other' => 'Other',
                            ])
                            ->required(),

                        Forms\Components\DatePicker::make('record_date')
                            ->label('Record Date')
                            ->required()
                            ->maxDate(now()),

                        Forms\Components\Textarea::make('description')
                            ->label('Description')
                            ->required()
                            ->columnSpanFull()
                            ->rows(4),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Veterinary Details')
                    ->schema([
                        Forms\Components\TextInput::make('vet_name')
                            ->label('Veterinarian Name')
                            ->maxLength(255),

                        Forms\Components\FileUpload::make('attachment_url')
                            ->label('Attachment')
                            ->directory('medical-records')
                            ->visibility('private')
                            ->acceptedFileTypes(['application/pdf', 'image/jpeg', 'image/png'])
                            ->maxSize(5120),
                    ])
                    ->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('pet.name')
                    ->label('Pet')
                    ->searchable()
                    ->sortable(),

                TextColumn::make('record_type')
                    ->label('Type')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'vaccination' => 'success',
                        'medical_note' => 'info',
                        'surgery' => 'warning',
                        'prescription' => 'primary',
                        'diagnosis' => 'danger',
                        default => 'gray',
                    }),

                TextColumn::make('record_date')
                    ->label('Date')
                    ->date()
                    ->sortable(),

                TextColumn::make('vet_name')
                    ->label('Veterinarian')
                    ->searchable()
                    ->sortable()
                    ->placeholder('Not specified'),

                TextColumn::make('description')
                    ->label('Description')
                    ->limit(50)
                    ->tooltip(fn (Tables\Columns\TextColumn $column): ?string => strlen($column->getState()) > 50 ? $column->getState() : null),

                TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('pet_id')
                    ->label('Pet')
                    ->relationship('pet', 'name')
                    ->searchable()
                    ->preload(),

                SelectFilter::make('record_type')
                    ->label('Type')
                    ->options([
                        'vaccination' => 'Vaccination',
                        'medical_note' => 'Medical Note',
                        'surgery' => 'Surgery',
                        'prescription' => 'Prescription',
                        'diagnosis' => 'Diagnosis',
                        'other' => 'Other',
                    ]),
            ])
            ->actions([
                ViewAction::make(),
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('record_date', 'desc');
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListMedicalRecords::route('/'),
            'create' => Pages\CreateMedicalRecord::route('/create'),
            'view' => Pages\ViewMedicalRecord::route('/{record}'),
            'edit' => Pages\EditMedicalRecord::route('/{record}/edit'),
        ];
    }
}
