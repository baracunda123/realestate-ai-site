using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace realestate_ia_site.Server.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPropertyTrackingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "archivedAt",
                table: "properties",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "lastSeenAt",
                table: "properties",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "status",
                table: "properties",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_properties_lastSeenAt",
                table: "properties",
                column: "lastSeenAt");

            migrationBuilder.CreateIndex(
                name: "IX_properties_source_site_status",
                table: "properties",
                columns: new[] { "source_site", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_properties_status",
                table: "properties",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_properties_status_lastSeenAt",
                table: "properties",
                columns: new[] { "status", "lastSeenAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_properties_lastSeenAt",
                table: "properties");

            migrationBuilder.DropIndex(
                name: "IX_properties_source_site_status",
                table: "properties");

            migrationBuilder.DropIndex(
                name: "IX_properties_status",
                table: "properties");

            migrationBuilder.DropIndex(
                name: "IX_properties_status_lastSeenAt",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "archivedAt",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "lastSeenAt",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "status",
                table: "properties");
        }
    }
}
