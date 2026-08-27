<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Listing;
use Illuminate\Http\Request;

class AppointmentController extends Controller {

    public function myAppointments(Request $request) {
        $user = $request->user();

        $asClient = Appointment::with(['listing', 'provider'])
            ->where('client_id', $user->id)
            ->latest()
            ->get();

        $asProvider = Appointment::with(['listing', 'client'])
            ->where('provider_id', $user->id)
            ->latest()
            ->get();

        return response()->json([
            'as_client'   => $asClient,
            'as_provider' => $asProvider,
        ]);
    }

    public function store(Request $request) {
        $request->validate([
            'listing_id'       => 'required|exists:listings,id',
            'appointment_date' => 'required|date|after_or_equal:today',
            'time_slot'        => 'required|string|max:50',
            'notes'            => 'nullable|string|max:500',
        ]);

        $listing = Listing::findOrFail($request->listing_id);

        if ($listing->user_id === $request->user()->id) {
            return response()->json(['message' => 'You cannot book an appointment with yourself.'], 422);
        }

        $appointment = Appointment::create([
            'listing_id'       => $listing->id,
            'client_id'        => $request->user()->id,
            'provider_id'      => $listing->user_id,
            'appointment_date' => $request->appointment_date,
            'time_slot'        => $request->time_slot,
            'notes'            => $request->notes,
            'status'           => 'pending',
        ]);

        return response()->json([
            'message'     => 'Service appointment booked successfully!',
            'appointment' => $appointment->load(['listing', 'provider']),
        ], 201);
    }

    public function updateStatus(Request $request, Appointment $appointment) {
        $request->validate([
            'status' => 'required|in:confirmed,completed,cancelled',
        ]);

        $user = $request->user();

        if ($appointment->client_id !== $user->id && $appointment->provider_id !== $user->id) {
            return response()->json(['message' => 'Unauthorised.'], 403);
        }

        $appointment->status = $request->status;
        $appointment->save();

        return response()->json([
            'message'     => "Appointment {$request->status} successfully.",
            'appointment' => $appointment->load(['listing', 'client', 'provider']),
        ]);
    }
}
