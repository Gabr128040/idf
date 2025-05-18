from rest_framework import serializers
from .models import Igreja, Transacao, Relatorio, Profile

class IgrejaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Igreja
        fields = '__all__'

class TransacaoSerializer(serializers.ModelSerializer):
    igreja = IgrejaSerializer(read_only=True)
    igreja_id = serializers.PrimaryKeyRelatedField(
        queryset=Igreja.objects.all(), source='igreja', write_only=True
    )
    class Meta:
        model = Transacao
        fields = '__all__'


class RelatorioSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    igreja = IgrejaSerializer(read_only=True)
    igreja_id = serializers.PrimaryKeyRelatedField(
        queryset=Igreja.objects.all(), source='igreja', write_only=True
    )

    class Meta:
        model = Relatorio
        fields = ['id', 'nome', 'mes', 'ano', 'data_geracao', 'url', 'igreja', 'igreja_id']

    def get_url(self, obj):
        return obj.arquivo.url if obj.arquivo else None

class ProfileSerializer(serializers.ModelSerializer):
    igreja = IgrejaSerializer(read_only=True)
    igreja_id = serializers.PrimaryKeyRelatedField(queryset=Igreja.objects.all(), source='igreja', write_only=True)
    class Meta:
        model = Profile
        fields = ['igreja', 'igreja_id']


