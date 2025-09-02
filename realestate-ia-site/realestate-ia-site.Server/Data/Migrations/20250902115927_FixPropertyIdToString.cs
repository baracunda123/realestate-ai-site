using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace realestate_ia_site.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class FixPropertyIdToString : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PropertyPriceHistories_properties_PropertyId1",
                table: "PropertyPriceHistories");

            migrationBuilder.DropIndex(
                name: "IX_PropertyPriceHistories_PropertyId1",
                table: "PropertyPriceHistories");

            migrationBuilder.DropColumn(
                name: "PropertyId1",
                table: "PropertyPriceHistories");

            migrationBuilder.AlterColumn<string>(
                name: "PropertyId",
                table: "PropertyPriceHistories",
                type: "text",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddForeignKey(
                name: "FK_PropertyPriceHistories_properties_PropertyId",
                table: "PropertyPriceHistories",
                column: "PropertyId",
                principalTable: "properties",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PropertyPriceHistories_properties_PropertyId",
                table: "PropertyPriceHistories");

            migrationBuilder.AlterColumn<Guid>(
                name: "PropertyId",
                table: "PropertyPriceHistories",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "PropertyId1",
                table: "PropertyPriceHistories",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyPriceHistories_PropertyId1",
                table: "PropertyPriceHistories",
                column: "PropertyId1");

            migrationBuilder.AddForeignKey(
                name: "FK_PropertyPriceHistories_properties_PropertyId1",
                table: "PropertyPriceHistories",
                column: "PropertyId1",
                principalTable: "properties",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
