<?php

declare(strict_types=1);

namespace App\Http\Controllers\VaccinationRecordPhoto;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\VaccinationRecord;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Delete(
    path: '/api/pets/{pet}/vaccinations/{record}/photo',
    summary: 'Delete the photo from a vaccination record',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'pet', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'record', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
    ],
    responses: [
        new OA\Response(response: 204, description: 'Photo deleted successfully'),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 404, description: 'Not found'),
    ]
)]
class DeleteVaccinationRecordPhotoController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;

    public function __invoke(Request $request, Pet $pet, VaccinationRecord $record)
    {
        $this->validatePetResource($request, $pet, 'vaccinations', $record);

        $media = $record->getFirstMedia('photo');

        if (! $media) {
            return $this->sendError(__('messages.pets.photo_not_found'), 404);
        }

        $media->delete();

        return $this->sendSuccess(null, 204);
    }
}
