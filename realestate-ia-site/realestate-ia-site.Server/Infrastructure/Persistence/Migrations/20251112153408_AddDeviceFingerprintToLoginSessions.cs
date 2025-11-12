using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace realestate_ia_site.Server.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDeviceFingerprintToLoginSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "device_fingerprint",
                table: "user_login_sessions",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "device_fingerprint",
                table: "user_login_sessions");
        }
    }
}
