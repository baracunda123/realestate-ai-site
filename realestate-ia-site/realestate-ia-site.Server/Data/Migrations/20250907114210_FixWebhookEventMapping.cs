using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace realestate_ia_site.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class FixWebhookEventMapping : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_webhook_events_created_at",
                table: "webhook_events",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "IX_webhook_events_event_type",
                table: "webhook_events",
                column: "event_type");

            migrationBuilder.CreateIndex(
                name: "IX_webhook_events_stripe_event_id",
                table: "webhook_events",
                column: "stripe_event_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_webhook_events_created_at",
                table: "webhook_events");

            migrationBuilder.DropIndex(
                name: "IX_webhook_events_event_type",
                table: "webhook_events");

            migrationBuilder.DropIndex(
                name: "IX_webhook_events_stripe_event_id",
                table: "webhook_events");
        }
    }
}
