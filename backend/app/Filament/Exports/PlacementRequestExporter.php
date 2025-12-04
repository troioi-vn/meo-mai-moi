<?php

namespace App\Filament\Exports;

use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Models\PlacementRequest;
use Filament\Actions\Exports\ExportColumn;
use Filament\Actions\Exports\Exporter;
use Filament\Actions\Exports\Models\Export;

class PlacementRequestExporter extends Exporter
{
    protected static ?string $model = PlacementRequest::class;

    public static function getColumns(): array
    {
        return [
            ExportColumn::make('id')
                ->label('ID'),
            ExportColumn::make('pet.name')
                ->label('Pet Name'),
            ExportColumn::make('pet.petType.name')
                ->label('Pet Type'),
            ExportColumn::make('user.name')
                ->label('Owner Name'),
            ExportColumn::make('user.email')
                ->label('Owner Email'),
            ExportColumn::make('request_type')
                ->label('Request Type')
                ->formatStateUsing(fn (PlacementRequestType $state): string => match ($state) {
                    PlacementRequestType::FOSTER_PAYED => 'Foster (Paid)',
                    PlacementRequestType::FOSTER_FREE => 'Foster (Free)',
                    PlacementRequestType::PERMANENT => 'Permanent',
                    default => $state->value,
                }),
            ExportColumn::make('status')
                ->label('Status')
                ->formatStateUsing(fn (PlacementRequestStatus $state): string => match ($state) {
                    PlacementRequestStatus::OPEN => 'Open',
                    PlacementRequestStatus::PENDING_REVIEW => 'Pending Review',
                    PlacementRequestStatus::FULFILLED => 'Fulfilled',
                    PlacementRequestStatus::EXPIRED => 'Expired',
                    PlacementRequestStatus::CANCELLED => 'Cancelled',
                    default => $state->value,
                }),
            ExportColumn::make('notes')
                ->label('Description'),
            ExportColumn::make('start_date')
                ->label('Start Date'),
            ExportColumn::make('end_date')
                ->label('End Date'),
            ExportColumn::make('expires_at')
                ->label('Expires At'),
            ExportColumn::make('status')
                ->label('Status')
                ->formatStateUsing(fn ($state) => $state->value ?? 'Unknown'),
            ExportColumn::make('transfer_requests_count')
                ->label('Response Count')
                ->counts('transferRequests'),
            ExportColumn::make('created_at')
                ->label('Created At'),
            ExportColumn::make('updated_at')
                ->label('Updated At'),
        ];
    }

    public static function getCompletedNotificationBody(Export $export): string
    {
        $body = 'Your placement request export has completed and '.number_format($export->successful_rows).' '.str('row')->plural($export->successful_rows).' exported.';

        if ($failedRowsCount = $export->getFailedRowsCount()) {
            $body .= ' '.number_format($failedRowsCount).' '.str('row')->plural($failedRowsCount).' failed to export.';
        }

        return $body;
    }
}
