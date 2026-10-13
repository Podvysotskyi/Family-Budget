<?php

namespace Tests\Feature;

use App\Models\Invitation;
use App\Models\Member;
use App\Models\User;
use Illuminate\Support\Str;
use Tests\FinanceTestCase;

class HouseholdMemberTest extends FinanceTestCase
{
    public function test_adds_member_and_linked_invitation_without_duplicating_a_retried_command(): void
    {
        [$owner, $house, $ownerMember] = $this->household();
        $invitee = User::factory()->create(['email' => 'jamie@example.com']);
        $payload = ['nickname' => 'Jamie', 'email' => 'Jamie@example.com', 'command_key' => (string) Str::uuid()];

        $this->actingAs($owner)->from('/household')->post('/household/members', $payload)->assertRedirect('/household')->assertSessionHasNoErrors();

        $member = Member::where('household_id', $house->id)->where('nickname', 'Jamie')->firstOrFail();
        $this->assertDatabaseHas('invitations', ['household_id' => $house->id, 'target_member_id' => $member->id, 'target_email' => 'jamie@example.com', 'invited_by_member_id' => $ownerMember->id, 'status' => 'pending']);
        $this->assertDatabaseHas('notifications', ['user_id' => $invitee->id, 'kind' => 'invitation']);

        $this->actingAs($owner)->from('/household')->post('/household/members', $payload)->assertRedirect('/household');

        $this->assertDatabaseCount('household_members', 2);
        $this->assertDatabaseCount('invitations', 1);
        $this->assertDatabaseCount('notifications', 1);
    }

    public function test_adds_member_without_login_when_email_is_omitted(): void
    {
        [$owner, $house] = $this->household();

        $this->actingAs($owner)->post('/household/members', ['nickname' => 'Jamie'])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertDatabaseHas('household_members', ['household_id' => $house->id, 'nickname' => 'Jamie', 'user_id' => null]);
        $this->assertDatabaseCount('invitations', 0);
        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_invalid_invitation_email_does_not_leave_a_member_behind(): void
    {
        [$owner] = $this->household();

        $this->actingAs($owner)->post('/household/members', ['nickname' => 'Jamie', 'email' => 'invalid-email'])->assertInvalid(['email']);

        $this->assertDatabaseCount('household_members', 1);
        $this->assertDatabaseCount('invitations', 0);
        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_member_cannot_add_another_member_or_invitation(): void
    {
        [$owner, $house] = $this->household();
        $memberUser = User::factory()->create();
        Member::create(['household_id' => $house->id, 'user_id' => $memberUser->id, 'nickname' => 'Member']);

        $this->actingAs($memberUser)->post('/household/members', ['nickname' => 'Jamie', 'email' => 'jamie@example.com'])->assertForbidden();

        $this->assertDatabaseCount('household_members', 2);
        $this->assertDatabaseCount('invitations', 0);
    }

    public function test_accepting_the_invitation_links_the_created_member_and_preserves_the_nickname(): void
    {
        [$owner, $house] = $this->household();
        $invitee = User::factory()->create(['name' => 'James Rivera', 'email' => 'jamie@example.com']);
        $this->actingAs($owner)->post('/household/members', ['nickname' => 'Jamie', 'email' => $invitee->email])->assertRedirect();
        $invitation = Invitation::where('household_id', $house->id)->firstOrFail();

        $this->actingAs($invitee)->post('/invitations/'.$invitation->id.'/accept')->assertRedirect('/home');

        $this->assertDatabaseHas('household_members', ['id' => $invitation->target_member_id, 'nickname' => 'Jamie', 'user_id' => $invitee->id]);
        $this->assertDatabaseCount('household_members', 2);
        $this->assertDatabaseHas('invitations', ['id' => $invitation->id, 'status' => 'accepted']);
    }
}
